import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runAnalysis() {
  console.log("=====================================");
  console.log("EMAIL ANALYSIS - TRANSACTION EXTRACTION");
  console.log("=====================================\n");

  try {
    // Analysis 1: Top senders (last 4 months)
    console.log("\n1. TOP SENDERS (Nov 2025 - Mar 2026)");
    console.log("-----------------------------------");
    const { data: topSenders, error: error1 } = await supabase.rpc(
      "execute_query",
      {
        query: `
          SELECT from_address, from_name, COUNT(*) as cnt
          FROM emails
          WHERE date >= '2025-11-01'
          GROUP BY from_address, from_name
          ORDER BY cnt DESC
          LIMIT 40
        `,
      }
    );

    if (error1) {
      // Fallback to direct query
      const { data, error } = await supabase
        .from("emails")
        .select("from_address, from_name")
        .gte("date", "2025-11-01");

      if (error) {
        console.error("Error:", error);
      } else {
        const grouped: Record<string, Record<string, number>> = {};
        data?.forEach((email: any) => {
          const key = `${email.from_address}||${email.from_name}`;
          grouped[key] = grouped[key] || { count: 0 };
          grouped[key].count++;
        });

        const results = Object.entries(grouped)
          .map(([key, val]) => {
            const [address, name] = key.split("||");
            return {
              from_address: address,
              from_name: name,
              cnt: val.count,
            };
          })
          .sort((a, b) => b.cnt - a.cnt)
          .slice(0, 40);

        console.table(results);
      }
    } else if (topSenders) {
      console.table(topSenders);
    }

    // Analysis 2: Monthly volume by top senders
    console.log("\n\n2. MONTHLY VOLUME BY TOP SENDERS");
    console.log("--------------------------------");
    const { data: monthlyData, error: error2 } = await supabase
      .from("emails")
      .select("date, from_address")
      .gte("date", "2025-11-01");

    if (error2) {
      console.error("Error:", error2);
    } else {
      const monthly: Record<string, Record<string, number>> = {};

      monthlyData?.forEach((email: any) => {
        if (!email.date) return;
        const month = email.date.substring(0, 7); // YYYY-MM
        const monthKey = month;

        if (!monthly[monthKey]) {
          monthly[monthKey] = {};
        }
        const addr = email.from_address || "unknown";
        monthly[monthKey][addr] = (monthly[monthKey][addr] || 0) + 1;
      });

      // Get top senders overall
      const senderCounts: Record<string, number> = {};
      Object.values(monthly).forEach((monthData) => {
        Object.entries(monthData).forEach(([addr, count]) => {
          senderCounts[addr] = (senderCounts[addr] || 0) + count;
        });
      });

      const topAddresses = Object.entries(senderCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([addr]) => addr);

      const results: any[] = [];
      Object.entries(monthly)
        .sort()
        .forEach(([month, monthData]) => {
          topAddresses.forEach((addr) => {
            results.push({
              month,
              from_address: addr,
              cnt: monthData[addr] || 0,
            });
          });
        });

      console.log("Showing top 20 senders across all months:");
      console.table(results);
    }

    // Analysis 3: Sample subjects from top senders
    console.log("\n\n3. SAMPLE SUBJECTS FROM TOP 15 SENDERS");
    console.log("--------------------------------------");

    const { data: sendersList, error: error3 } = await supabase
      .from("emails")
      .select("from_address, from_name")
      .gte("date", "2025-11-01");

    if (error3) {
      console.error("Error:", error3);
    } else {
      const senderGrouped: Record<string, number> = {};
      sendersList?.forEach((email: any) => {
        const key = email.from_address;
        senderGrouped[key] = (senderGrouped[key] || 0) + 1;
      });

      const topAddresses = Object.entries(senderGrouped)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([addr]) => addr);

      console.log("\nTop 15 senders and sample subjects:");
      for (const address of topAddresses) {
        const { data: subjects, error } = await supabase
          .from("emails")
          .select("subject")
          .eq("from_address", address)
          .gte("date", "2025-11-01")
          .limit(3);

        if (!error && subjects) {
          console.log(`\n${address}:`);
          subjects.forEach((email: any, idx: number) => {
            console.log(`  ${idx + 1}. ${email.subject?.substring(0, 80) || "(no subject)"}`);
          });
        }
      }
    }

    // Analysis 4: Email transactions by classification
    console.log("\n\n4. EXTRACTED TRANSACTIONS BY SENDER & CLASSIFICATION");
    console.log("----------------------------------------------------");

    const { data: transactions, error: error4 } = await supabase
      .from("email_transactions")
      .select("from_address, status, classification, extraction_confidence");

    if (error4) {
      console.error("Error:", error4);
    } else {
      const grouped: Record<string, any> = {};

      transactions?.forEach((txn: any) => {
        const key = `${txn.from_address}||${txn.status}||${txn.classification}`;
        if (!grouped[key]) {
          grouped[key] = {
            from_address: txn.from_address,
            status: txn.status,
            classification: txn.classification,
            cnt: 0,
            total_confidence: 0,
            min_confidence: 100,
            max_confidence: 0,
          };
        }
        grouped[key].cnt++;
        grouped[key].total_confidence += txn.extraction_confidence || 0;
        grouped[key].min_confidence = Math.min(grouped[key].min_confidence, txn.extraction_confidence || 0);
        grouped[key].max_confidence = Math.max(grouped[key].max_confidence, txn.extraction_confidence || 0);
      });

      const results = Object.values(grouped)
        .map((row: any) => ({
          from_address: row.from_address,
          status: row.status,
          classification: row.classification,
          cnt: row.cnt,
          avg_conf: (row.total_confidence / row.cnt).toFixed(3),
          min_conf: row.min_confidence.toFixed(3),
          max_conf: row.max_confidence.toFixed(3),
        }))
        .sort((a: any, b: any) => b.cnt - a.cnt);

      console.table(results);
    }

    // Analysis 5: Emails with bodies available
    console.log("\n\n5. EMAIL BODY AVAILABILITY (TOP 30 SENDERS)");
    console.log("-------------------------------------------");

    const { data: bodyData, error: error5 } = await supabase
      .from("emails")
      .select("from_address, text_body, html_body")
      .gte("date", "2025-11-01");

    if (error5) {
      console.error("Error:", error5);
    } else {
      const grouped: Record<string, any> = {};

      bodyData?.forEach((email: any) => {
        const addr = email.from_address || "unknown";
        if (!grouped[addr]) {
          grouped[addr] = {
            from_address: addr,
            total: 0,
            has_body: 0,
            missing_body: 0,
          };
        }
        grouped[addr].total++;
        if (email.text_body || email.html_body) {
          grouped[addr].has_body++;
        } else {
          grouped[addr].missing_body++;
        }
      });

      const results = Object.values(grouped)
        .map((row: any) => ({
          from_address: row.from_address,
          total: row.total,
          has_body: row.has_body,
          missing_body: row.missing_body,
          availability_pct: ((row.has_body / row.total) * 100).toFixed(1) + "%",
        }))
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 30);

      console.table(results);
    }

    // Analysis 6: Subject patterns for known transaction senders
    console.log("\n\n6. SUBJECT PATTERNS FOR KNOWN TRANSACTION SENDERS");
    console.log("--------------------------------------------------");

    const knownSenders = [
      "grab",
      "bolt",
      "lazada",
      "shopee",
      "foodpanda",
      "agoda",
      "line",
      "apple",
      "google",
      "amazon",
    ];

    for (const sender of knownSenders) {
      const { data: emails, error } = await supabase
        .from("emails")
        .select("from_address, subject")
        .ilike("from_address", `%${sender}%`)
        .gte("date", "2025-11-01")
        .limit(100);

      if (!error && emails && emails.length > 0) {
        const subjects = emails.map((e: any) => e.subject).filter(Boolean);
        const uniqueSubjects = [...new Set(subjects)].slice(0, 5);

        console.log(`\n${sender.toUpperCase()} (${emails.length} emails):`);
        uniqueSubjects.forEach((subject: string, idx: number) => {
          console.log(`  ${idx + 1}. "${subject.substring(0, 100)}"`);
        });
      }
    }

    // Summary stats
    console.log("\n\n7. OVERALL STATISTICS");
    console.log("---------------------");

    const { count: totalEmails, error: countError1 } = await supabase
      .from("emails")
      .select("*", { count: "exact", head: true });

    const { count: recentEmails, error: countError2 } = await supabase
      .from("emails")
      .select("*", { count: "exact", head: true })
      .gte("date", "2025-11-01");

    const { count: extractedCount, error: countError3 } = await supabase
      .from("email_transactions")
      .select("*", { count: "exact", head: true });

    console.log(`Total emails: ${totalEmails || "?"}`);
    console.log(`Emails since Nov 2025: ${recentEmails || "?"}`);
    console.log(`Extracted transactions: ${extractedCount || "?"}`);
    console.log(`Extraction rate: ${recentEmails && extractedCount ? ((extractedCount / recentEmails) * 100).toFixed(2) + "%" : "?"}`);
  } catch (error) {
    console.error("Analysis error:", error);
  }
}

runAnalysis();
