// File: app/Nexoria.mjs
// Built for Base - read-only inspector
// Primary target: Base Mainnet
// Validation target: Base Sepolia (chainId 84532, https://sepolia.basescan.org)
// No transactions - no signing - no onchain writes

import CoinbaseWalletSDK from "@coinbase/wallet-sdk";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  isAddress,
  parseGwei,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const NETWORKS = {
  mainnet: {
    name: "Base Mainnet",
    chain: base,
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    explorer: "https://basescan.org",
  },
  sepolia: {
    name: "Base Sepolia",
    chain: baseSepolia,
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
  },
};

function parseArgs(argv) {
  const out = { network: "mainnet", targetsFile: "samples/targets.json", reportFile: "reports/latest.json" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--network" && argv[i + 1]) out.network = String(argv[++i]);
    if (a === "--targets" && argv[i + 1]) out.targetsFile = String(argv[++i]);
    if (a === "--report" && argv[i + 1]) out.reportFile = String(argv[++i]);
  }
  if (!NETWORKS[out.network]) out.network = "mainnet";
  return out;
}

function isoNow() {
  return new Date().toISOString();
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function safeReadJson(filePath, fallback) {
  try {
    const s = fs.readFileSync(filePath, "utf8");
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function safeWriteJson(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function short(addr) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function linkAddress(explorer, address) {
  return `${explorer}/address/${address}`;
}

function linkBlock(explorer, blockNumber) {
  return `${explorer}/block/${blockNumber}`;
}

function linkTx(explorer, hash) {
  return `${explorer}/tx/${hash}`;
}

function linkCode(explorer, address) {
  return `${explorer}/address/${address}#code`;
}

function gwei(value) {
  const n = Number(value) / 1e9;
  if (!Number.isFinite(n)) return `${value} wei`;
  return `${n.toFixed(3)} gwei`;
}

function makeLogger() {
  const lines = [];
  const emit = (line = "") => {
    lines.push(line);
    // eslint-disable-next-line no-console
    console.log(line);
  };
  return { emit, lines };
}

async function tryLoadBaseAccountSdk(emit) {
  try {
    const mod = await import("@base-org/account");
    const keys = Object.keys(mod || {});
    emit(`Base package check: @base-org/account loaded (${keys.length} exports)`);
    if (keys.length) emit(`Base package sample export: ${keys[0]}`);
  } catch (e) {
    emit(`Base package check: @base-org/account not loaded (${e?.message || String(e)})`);
  }
}

function createCoinbaseProvider({ appName, appLogoUrl, rpcUrl, chainId }) {
  const sdk = new CoinbaseWalletSDK({
    appName,
    appLogoUrl,
    darkMode: false,
    overrideIsMetaMask: false,
    overrideIsCoinbaseWallet: true,
  });
  return sdk.makeWeb3Provider(rpcUrl, chainId);
}

function createClients({ chain, rpcUrl, provider }) {
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain, transport: custom(provider) });
  return { publicClient, walletClient };
}

async function connectWallet(walletClient, emit, expectedChainId) {
  const chainId = await walletClient.getChainId();
  emit(`Wallet chainId: ${chainId}`);
  if (Number(chainId) !== Number(expectedChainId)) {
    emit(`Warning: wallet chainId differs from expected ${expectedChainId} - reads still use configured RPC`);
  }

  const addrs = await walletClient.getAddresses();
  if (!addrs?.length) throw new Error("No addresses returned by wallet");
  emit(`Wallet addresses: ${addrs.length}`);
  return addrs;
}

async function readBalances(publicClient, explorer, addresses, emit) {
  const results = [];
  emit("Balances:");
  for (const addr of addresses) {
    const bal = await publicClient.getBalance({ address: addr });
    const eth = formatEther(bal);
    emit(`- ${short(addr)}: ${eth} ETH - ${linkAddress(explorer, addr)}`);
    results.push({ address: addr, balanceWei: bal.toString(), balanceEth: eth, basescan: linkAddress(explorer, addr) });
  }
  emit("");
  return results;
}

async function readChainSignals(publicClient, explorer, emit) {
  const bn = await publicClient.getBlockNumber();
  const block = await publicClient.getBlock({ blockNumber: bn });
  const gasPrice = await publicClient.getGasPrice();

  emit("Block and gas:");
  emit(`- Latest block: ${bn.toString()} - ${linkBlock(explorer, bn.toString())}`);
  emit(`- Timestamp: ${new Date(Number(block.timestamp) * 1000).toISOString()}`);
  emit(`- Gas price: ${gwei(gasPrice)}`);

  let baseFee = null;
  if (block.baseFeePerGas != null) {
    baseFee = block.baseFeePerGas;
    emit(`- Base fee: ${gwei(baseFee)}`);
  } else {
    emit("- Base fee: unavailable in block response");
  }

  const history = await publicClient.getFeeHistory({
    blockCount: 8,
    rewardPercentiles: [10, 50, 90],
  });

  emit(`- Fee history points: ${history.baseFeePerGas.length}`);
  emit(`- Oldest block in history: ${history.oldestBlock.toString()}`);
  emit("");

  return {
    latestBlock: bn.toString(),
    blockTimestamp: block.timestamp.toString(),
    gasPriceWei: gasPrice.toString(),
    gasPriceGwei: gwei(gasPrice),
    baseFeeWei: baseFee ? baseFee.toString() : null,
    baseFeeGwei: baseFee ? gwei(baseFee) : null,
    feeHistory: {
      oldestBlock: history.oldestBlock.toString(),
      baseFeePerGasWei: history.baseFeePerGas.map((x) => x.toString()),
      rewardWei: history.reward?.map((arr) => arr.map((x) => x.toString())) ?? [],
    },
    basescan: {
      block: linkBlock(explorer, bn.toString()),
      gasTracker: `${explorer}/gastracker`,
      blocks: `${explorer}/blocks`,
    },
  };
}

async function checkBytecode(publicClient, explorer, targets, emit) {
  const out = [];
  emit("Bytecode checks:");
  for (const t of targets) {
    if (!isAddress(t)) {
      emit(`- Skipped invalid address: ${t}`);
      out.push({ input: t, valid: false, hasBytecode: null, basescan: null });
      continue;
    }
    const code = await publicClient.getBytecode({ address: t });
    const has = !!code && code !== "0x";
    emit(`- ${short(t)}: ${has ? "Bytecode found" : "No bytecode"} - ${linkAddress(explorer, t)}`);
    out.push({ input: t, valid: true, hasBytecode: has, basescan: linkAddress(explorer, t), codeLink: linkCode(explorer, t) });
  }
  emit("");
  return out;
}

function printExplorerShortcuts(explorer, emit) {
  emit("Explorer shortcuts:");
  emit(`- Explorer root: ${explorer}`);
  emit(`- Blocks: ${explorer}/blocks`);
  emit(`- Gas tracker: ${explorer}/gastracker`);
  emit(`- Verified contracts: ${explorer}/contractsVerified`);
  emit("");
}

function buildReport({ meta, wallet, balances, chainSignals, bytecode }) {
  return {
    meta,
    wallet,
    balances,
    chainSignals,
    bytecode,
  };
}

export async function run() {
  const { emit, lines } = makeLogger();
  const args = parseArgs(process.argv);
  const net = NETWORKS[args.network];

  const repoRoot = process.cwd();
  const targetsPath = path.join(repoRoot, args.targetsFile);
  const reportPath = path.join(repoRoot, args.reportFile);

  const targetsJson = safeReadJson(targetsPath, { targets: [] });
  const targets = Array.isArray(targetsJson.targets) ? targetsJson.targets : [];

  emit(`Time: ${isoNow()}`);
  emit("Built for Base");
  emit(`Network: ${net.name}`);
  emit(`chainId (decimal): ${net.chainId}`);
  emit(`Explorer: ${net.explorer}`);
  emit(`RPC: ${net.rpcUrl}`);
  emit("");

  await tryLoadBaseAccountSdk(emit);
  emit("");

  const provider = createCoinbaseProvider({
    appName: "Nexoria",
    appLogoUrl: "https://avatars.githubusercontent.com/u/1885080?s=200&v=4",
    rpcUrl: net.rpcUrl,
    chainId: net.chainId,
  });

  const { publicClient, walletClient } = createClients({
    chain: net.chain,
    rpcUrl: net.rpcUrl,
    provider,
  });

  let addresses = [];
  let walletMeta = { connected: false, addresses: [], error: null };
  try {
    if (typeof window === "undefined") {
      emit("Wallet connect note: Coinbase Wallet connection requires a browser environment.");
      emit("This run will skip wallet address discovery and proceed with RPC-only reads.");
      emit("");
    } else {
      addresses = await connectWallet(walletClient, emit, net.chainId);
      walletMeta = { connected: true, addresses, error: null };
      for (const a of addresses) emit(`- ${a} - ${linkAddress(net.explorer, a)}`);
      emit("");
    }
  } catch (e) {
    walletMeta = { connected: false, addresses: [], error: e?.message || String(e) };
    emit(`Wallet connect failed: ${walletMeta.error}`);
    emit("");
  }

  const chainSignals = await readChainSignals(publicClient, net.explorer, emit);

  let balances = [];
  if (addresses.length) {
    balances = await readBalances(publicClient, net.explorer, addresses, emit);
  }

  const bytecode = await checkBytecode(publicClient, net.explorer, targets, emit);

  printExplorerShortcuts(net.explorer, emit);

  const report = buildReport({
    meta: {
      generatedAt: isoNow(),
      repository: "Nexoria",
      builtFor: "Base",
      network: args.network,
      chainId: net.chainId,
      explorer: net.explorer,
      rpcUrl: net.rpcUrl,
      targetsFile: args.targetsFile,
      reportFile: args.reportFile,
      readOnly: true,
    },
    wallet: walletMeta,
    balances,
    chainSignals,
    bytecode,
  });

  safeWriteJson(reportPath, report);

  ensureDir(path.join(repoRoot, "logs"));
  fs.writeFileSync(path.join(repoRoot, "logs", "run.log"), lines.join("\n") + "\n");

  emit(`Report written: ${args.reportFile}`);
  emit("Done");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  });
}
