# Terraform configuration for email processing infrastructure
# This configuration sets up the necessary resources for the email processing system

terraform {
  required_version = ">= 1.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # State storage - use Terraform Cloud (free tier)
  backend "remote" {
    organization = "joot-app"

    workspaces {
      name = "email-processing"
    }
  }
}

# Variables
variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "github_repository" {
  description = "GitHub repository name"
  type        = string
  default     = "joot-app"
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
}

variable "vercel_project_name" {
  description = "Vercel project name"
  type        = string
  default     = "joot-app"
}

variable "icloud_email" {
  description = "iCloud email address"
  type        = string
  sensitive   = true
}

variable "icloud_app_password" {
  description = "iCloud app-specific password"
  type        = string
  sensitive   = true
}

variable "allowed_email_senders" {
  description = "Comma-separated list of allowed email senders"
  type        = string
  default     = ""
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}

variable "supabase_anon_key" {
  description = "Supabase anonymous key"
  type        = string
  sensitive   = true
}

variable "supabase_service_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "PostgreSQL connection string for pg-boss"
  type        = string
  sensitive   = true
}

# Providers
provider "github" {
  token = var.github_token
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "random" {}

# Generate webhook secret
resource "random_password" "webhook_secret" {
  length  = 32
  special = false
}

# GitHub repository secrets
resource "github_actions_secret" "email_webhook_secret" {
  repository      = var.github_repository
  secret_name     = "EMAIL_WEBHOOK_SECRET"
  plaintext_value = random_password.webhook_secret.result
}

resource "github_actions_secret" "vercel_email_endpoint" {
  repository      = var.github_repository
  secret_name     = "VERCEL_EMAIL_ENDPOINT"
  plaintext_value = "https://${var.vercel_project_name}.vercel.app/api/email/check-trigger"
}

# Vercel environment variables
resource "vercel_project_environment_variable" "icloud_email" {
  project_id = data.vercel_project.joot.id
  key        = "ICLOUD_EMAIL"
  value      = var.icloud_email
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "icloud_app_password" {
  project_id = data.vercel_project.joot.id
  key        = "ICLOUD_APP_PASSWORD"
  value      = var.icloud_app_password
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "icloud_imap_host" {
  project_id = data.vercel_project.joot.id
  key        = "ICLOUD_IMAP_HOST"
  value      = "imap.mail.me.com"
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "icloud_imap_port" {
  project_id = data.vercel_project.joot.id
  key        = "ICLOUD_IMAP_PORT"
  value      = "993"
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "email_webhook_secret" {
  project_id = data.vercel_project.joot.id
  key        = "EMAIL_WEBHOOK_SECRET"
  value      = random_password.webhook_secret.result
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "allowed_email_senders" {
  project_id = data.vercel_project.joot.id
  key        = "ALLOWED_EMAIL_SENDERS"
  value      = var.allowed_email_senders
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "max_emails_per_run" {
  project_id = data.vercel_project.joot.id
  key        = "MAX_EMAILS_PER_RUN"
  value      = "5"
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "max_attachment_size_mb" {
  project_id = data.vercel_project.joot.id
  key        = "MAX_ATTACHMENT_SIZE_MB"
  value      = "10"
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "email_check_folder" {
  project_id = data.vercel_project.joot.id
  key        = "EMAIL_CHECK_FOLDER"
  value      = "INBOX"
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "email_processed_folder" {
  project_id = data.vercel_project.joot.id
  key        = "EMAIL_PROCESSED_FOLDER"
  value      = "INBOX/Processed"
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "supabase_url" {
  project_id = data.vercel_project.joot.id
  key        = "SUPABASE_URL"
  value      = var.supabase_url
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "supabase_anon_key" {
  project_id = data.vercel_project.joot.id
  key        = "SUPABASE_ANON_KEY"
  value      = var.supabase_anon_key
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "supabase_service_key" {
  project_id = data.vercel_project.joot.id
  key        = "SUPABASE_SERVICE_KEY"
  value      = var.supabase_service_key
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "database_url" {
  project_id = data.vercel_project.joot.id
  key        = "DATABASE_URL"
  value      = var.database_url
  target     = ["production", "preview"]
}

# Data source for existing Vercel project
data "vercel_project" "joot" {
  name = var.vercel_project_name
}

# Outputs
output "webhook_secret" {
  value     = random_password.webhook_secret.result
  sensitive = true
}

output "email_check_endpoint" {
  value = "https://${var.vercel_project_name}.vercel.app/api/email/check-trigger"
}

output "github_secrets_configured" {
  value = {
    webhook_secret  = github_actions_secret.email_webhook_secret.secret_name
    email_endpoint  = github_actions_secret.vercel_email_endpoint.secret_name
  }
}

output "vercel_env_vars_configured" {
  value = {
    icloud_email           = vercel_project_environment_variable.icloud_email.key
    email_webhook_secret   = vercel_project_environment_variable.email_webhook_secret.key
    email_check_folder     = vercel_project_environment_variable.email_check_folder.key
    email_processed_folder = vercel_project_environment_variable.email_processed_folder.key
  }
}