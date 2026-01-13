import fs from "node:fs";
import path from "node:path";

const REPORT_JSON = path.join(process.cwd(), "reports", "latest.json");
const OUT_MD = path.join(process.cwd(), "reports", "summary.md");

function safeReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function line(s = "") {
  return `${s}\n`;
}

const data = safeReadJson(REPORT_JSON);
if (!data) {
  fs.writeFileSync(OUT_MD, "No report found. Run an inspect script first.\n");
  process.exit(0);
}

let md = "";
md += line(`# Nexoria Report Summary`);
md += line();
md += line(`GeneratedAt: ${data?.meta?.generatedAt || "unknown"}`);
md += line(`BuiltFor: ${data?.meta?.builtFor || "unknown"}`);
md += line(`Network: ${data?.meta?.network || "unknown"}`);
md += line(`chainId: ${data?.meta?.chainId || "unknown"}`);
md += line(`Explorer: ${data?.meta?.explorer || "unknown"}`);
md += line();

md += line(`## Wallet`);
md += line(`Connected: ${String(data?.wallet?.connected ?? false)}`);
md += line(`Addresses: ${(data?.wallet?.addresses || []).length}`);
for (const a of data?.wallet?.addresses || []) md += line(`- ${a}`);
md += line();

md += line(`## Block And Fees`);
md += line(`LatestBlock: ${data?.chainSignals?.latestBlock || "unknown"}`);
md += line(`GasPrice: ${data?.chainSignals?.gasPriceGwei || "unknown"}`);
md += line(`BaseFee: ${data?.chainSignals?.baseFeeGwei || "unknown"}`);
md += line();

md += line(`## Bytecode Checks`);
for (const row of data?.bytecode || []) {
  if (!row.valid) md += line(`- invalid: ${row.input}`);
  else md += line(`- ${row.input}: ${row.hasBytecode ? "bytecode" : "no bytecode"}`);
}

fs.writeFileSync(OUT_MD, md);
