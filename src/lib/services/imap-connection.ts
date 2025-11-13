/**
 * IMAP Connection Service
 *
 * Handles IMAP connections, authentication, and basic operations
 * Provides connection pooling and automatic reconnection
 */

import Imap from 'imap'
import { decryptString } from '@/lib/utils/encryption'

export interface IMAPConfig {
  host: string
  port: number
  user: string
  password: string
  tls: boolean
  tlsOptions?: {
    rejectUnauthorized?: boolean
  }
}

export interface EmailAccount {
  id: string
  email_address: string
  imap_host: string
  imap_port: number
  imap_password_encrypted: string
  encryption_iv: string
}

export interface IMAPMessage {
  uid: number
  flags: string[]
  date: Date
  subject: string
  from: Array<{ name?: string; address: string }>
  to?: Array<{ name?: string; address: string }>
  messageId: string
  inReplyTo?: string
  body: Buffer
}

export interface IMAPFolderInfo {
  name: string
  delimiter: string
  attribs: string[]
  children?: IMAPFolderInfo[]
}

/**
 * Create IMAP configuration from email account
 */
export function createIMAPConfig(account: EmailAccount): IMAPConfig {
  // Decrypt the password
  const password = decryptString(
    account.imap_password_encrypted,
    account.encryption_iv
  )

  return {
    host: account.imap_host,
    port: account.imap_port,
    user: account.email_address,
    password: password,
    tls: account.imap_port === 993 || account.imap_port === 465, // SSL/TLS ports
    tlsOptions: {
      rejectUnauthorized: true // Verify SSL certificates
    }
  }
}

/**
 * IMAP Connection Manager
 * Handles a single IMAP connection with automatic reconnection
 */
export class IMAPConnection {
  private config: IMAPConfig
  private imap: Imap | null = null
  private connected: boolean = false
  private connecting: boolean = false

  constructor(config: IMAPConfig) {
    this.config = config
  }

  /**
   * Connect to IMAP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    if (this.connecting) {
      // Wait for existing connection attempt
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.connected) {
            clearInterval(checkInterval)
            resolve()
          } else if (!this.connecting) {
            clearInterval(checkInterval)
            reject(new Error('Connection attempt failed'))
          }
        }, 100)

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkInterval)
          reject(new Error('Connection timeout'))
        }, 30000)
      })
    }

    this.connecting = true

    return new Promise((resolve, reject) => {
      try {
        this.imap = new Imap({
          ...this.config,
          authTimeout: 10000,
          connTimeout: 15000
        })

        this.imap.once('ready', () => {
          this.connected = true
          this.connecting = false
          console.log('[IMAP] Connected to', this.config.host)
          resolve()
        })

        this.imap.once('error', (err) => {
          this.connected = false
          this.connecting = false
          console.error('[IMAP] Connection error:', err)
          reject(err)
        })

        this.imap.once('end', () => {
          this.connected = false
          this.connecting = false
          console.log('[IMAP] Connection ended')
        })

        this.imap.connect()
      } catch (error) {
        this.connecting = false
        reject(error)
      }
    })
  }

  /**
   * Disconnect from IMAP server
   */
  async disconnect(): Promise<void> {
    if (this.imap && this.connected) {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('[IMAP] Disconnect timeout, forcing close')
          this.connected = false
          resolve()
        }, 5000) // 5 second timeout

        this.imap!.once('end', () => {
          clearTimeout(timeout)
          this.connected = false
          console.log('[IMAP] Disconnected')
          resolve()
        })

        this.imap!.end()
      })
    }
  }

  /**
   * Test connection without keeping it open
   */
  static async testConnection(config: IMAPConfig): Promise<boolean> {
    const conn = new IMAPConnection(config)
    try {
      await conn.connect()
      await conn.disconnect()
      return true
    } catch (error) {
      console.error('[IMAP] Test connection failed:', error)
      return false
    }
  }

  /**
   * List all folders/mailboxes
   */
  async listFolders(): Promise<IMAPFolderInfo[]> {
    if (!this.connected) {
      await this.connect()
    }

    return new Promise((resolve, reject) => {
      this.imap!.getBoxes((err, boxes) => {
        if (err) {
          reject(err)
          return
        }

        const folders: IMAPFolderInfo[] = []

        function flattenBoxes(boxObj: any, prefix = ''): void {
          for (const [name, box] of Object.entries(boxObj as Record<string, any>)) {
            const fullName = prefix ? `${prefix}${box.delimiter}${name}` : name

            folders.push({
              name: fullName,
              delimiter: box.delimiter,
              attribs: box.attribs || []
            })

            // Recursively process children
            if (box.children) {
              flattenBoxes(box.children, fullName)
            }
          }
        }

        flattenBoxes(boxes)
        resolve(folders)
      })
    })
  }

  /**
   * Open a mailbox/folder
   */
  async openBox(folderName: string, readOnly: boolean = true): Promise<Imap.Box> {
    if (!this.connected) {
      await this.connect()
    }

    return new Promise((resolve, reject) => {
      this.imap!.openBox(folderName, readOnly, (err, box) => {
        if (err) {
          reject(err)
        } else {
          resolve(box)
        }
      })
    })
  }

  /**
   * Fetch messages from current mailbox
   */
  async fetchMessages(
    uids: string | string[],
    options: {
      bodies?: string | string[]
      struct?: boolean
      envelope?: boolean
    } = {}
  ): Promise<IMAPMessage[]> {
    if (!this.connected) {
      await this.connect()
    }

    const fetchOptions: any = {
      bodies: options.bodies || '',
      struct: options.struct !== undefined ? options.struct : true,
      envelope: options.envelope !== undefined ? options.envelope : true
    }

    return new Promise((resolve, reject) => {
      const messages: IMAPMessage[] = []

      const fetch = this.imap!.fetch(uids, fetchOptions)

      fetch.on('message', (msg, seqno) => {
        const messageData: Partial<IMAPMessage> = {
          flags: []
        }

        msg.on('body', (stream, info) => {
          const chunks: Buffer[] = []

          stream.on('data', (chunk) => {
            chunks.push(Buffer.from(chunk))
          })

          stream.once('end', () => {
            messageData.body = Buffer.concat(chunks)
          })
        })

        msg.once('attributes', (attrs) => {
          messageData.uid = attrs.uid
          messageData.flags = attrs.flags || []
          messageData.date = attrs.date || new Date()

          if (attrs.envelope) {
            messageData.subject = attrs.envelope.subject || ''
            messageData.from = attrs.envelope.from || []
            messageData.to = attrs.envelope.to
            messageData.messageId = attrs.envelope.messageId || ''
            messageData.inReplyTo = attrs.envelope.inReplyTo
          }
        })

        msg.once('end', () => {
          if (messageData.uid) {
            messages.push(messageData as IMAPMessage)
          }
        })
      })

      fetch.once('error', (err) => {
        reject(err)
      })

      fetch.once('end', () => {
        resolve(messages)
      })
    })
  }

  /**
   * Search for messages in current mailbox
   */
  async searchMessages(criteria: any[]): Promise<number[]> {
    if (!this.connected) {
      await this.connect()
    }

    return new Promise((resolve, reject) => {
      this.imap!.search(criteria, (err, results) => {
        if (err) {
          reject(err)
        } else {
          resolve(results || [])
        }
      })
    })
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Get the underlying IMAP instance (use with caution)
   */
  getIMAPInstance(): Imap | null {
    return this.imap
  }
}

/**
 * IMAP Connection Pool
 * Manages multiple IMAP connections for efficient reuse
 */
export class IMAPConnectionPool {
  private connections: Map<string, IMAPConnection> = new Map()
  private maxSize: number
  private minSize: number

  constructor(options: { maxSize?: number; minSize?: number } = {}) {
    this.maxSize = options.maxSize || parseInt(process.env.IMAP_POOL_MAX_SIZE || '10')
    this.minSize = options.minSize || parseInt(process.env.IMAP_POOL_MIN_SIZE || '2')
  }

  /**
   * Get or create a connection for an account
   */
  async getConnection(accountId: string, config: IMAPConfig): Promise<IMAPConnection> {
    let conn = this.connections.get(accountId)

    if (!conn) {
      conn = new IMAPConnection(config)
      this.connections.set(accountId, conn)
    }

    if (!conn.isConnected()) {
      await conn.connect()
    }

    return conn
  }

  /**
   * Release a connection (return to pool)
   */
  async releaseConnection(accountId: string): Promise<void> {
    const conn = this.connections.get(accountId)
    if (conn && conn.isConnected()) {
      await conn.disconnect()
    }
    this.connections.delete(accountId)
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.connections.entries()).map(
      ([accountId, conn]) => this.releaseConnection(accountId)
    )
    await Promise.all(promises)
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(c => c.isConnected()).length,
      maxSize: this.maxSize,
      minSize: this.minSize
    }
  }
}

// Global connection pool instance
let globalPool: IMAPConnectionPool | null = null

export function getConnectionPool(): IMAPConnectionPool {
  if (!globalPool) {
    globalPool = new IMAPConnectionPool()
  }
  return globalPool
}
