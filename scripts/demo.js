// Demo: a payment and a private message cross a 6-node offline mesh.
// Nobody on the path can read the message. The transaction is broadcast once, by the
// one node that regains internet. Usage: node demo.js [lossPercent]
import { Node, Network, seal } from '../src/mesh.js';
import { evaluatePolicy } from '../src/policy.js';

const loss = (Number(process.argv[2] ?? 30)) / 100;
let s = 7; const rng = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
const onchain = [];
const names = ['Payer', 'Relay-1', 'Relay-2', 'Relay-3', 'Gateway', 'Merchant'];
const nodes = names.map((n) => new Node(n, { gateway: n === 'Gateway' ? (tx) => onchain.push(tx) : null }));
for (let i = 0; i < nodes.length - 1; i++) nodes[i].link(nodes[i + 1]);
// a shortcut so there is more than one path
nodes[1].link(nodes[3]);
const [payer, , , , gateway, merchant] = nodes;
const net = new Network({ loss, rng });
const log = (m) => console.log(m);

log(`Mesh: ${names.join(' - ')}   (packet loss ${loss * 100}%, no internet except Gateway)\n`);

const policy = { maxPerPaymentZat: 100000, maxOfflineTotalZat: 250000, spentZat: 0, minExpiryHeight: 100 };
const req = { amountZat: 50000, recipient: 'merchant-ua', expiryHeight: 0 };
const decision = evaluatePolicy(policy, req);
log(`1. Payer policy check: ${decision.allowed ? 'ALLOWED' : 'DENIED ' + decision.reasons}  policyHash=${decision.policyHash.slice(0, 16)}...`);

const tx = Buffer.from('a'.repeat(4000), 'hex'); // stand-in for a PCZT-extracted shielded transaction
net.inject(payer, payer.makePacket('tx', tx));
net.inject(payer, payer.makePacket('sealed', seal(merchant.identity.pub,
  Buffer.from(JSON.stringify({ kind: 'receipt', amountZat: req.amountZat, policyHash: decision.policyHash })), payer.identity)));
net.inject(payer, payer.makePacket('sealed', seal(merchant.identity.pub,
  Buffer.from(JSON.stringify({ kind: 'message', text: 'Paid. Two bags, pickup at 5.' })), payer.identity)));
log('2. Payer sends: raw tx (public), sealed receipt, sealed message');

net.rounds(nodes, 4);
log('3. Retransmission rounds complete\n');

log('Results');
for (const n of nodes) {
  const got = n.inbox.map((m) => m.kind).join(', ') || '-';
  log(`  ${n.name.padEnd(9)} readable inbox: ${got.padEnd(18)} forwarded: ${n.forwarded}`);
}
log(`\n  Broadcast to chain: ${onchain.length} time(s) by ${onchain.length ? 'Gateway' : 'nobody'}`);
log(`  Radio transmissions: ${net.sent}`);
const ok = onchain.length === 1 && merchant.inbox.length === 2 && nodes.slice(0, 5).every((n) => n.inbox.length === 0);
log(ok ? '\nPASS: merchant got receipt+message, relays read nothing, tx broadcast once' : '\nFAIL');
process.exitCode = ok ? 0 : 1;
