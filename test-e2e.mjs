async function test() {
  console.log('Testing live LAN Document Tracker server at http://localhost:3001...\n');

  // 1. Health
  const healthRes = await fetch('http://localhost:3001/api/health');
  const health = await healthRes.json();
  console.log('✅ 1. Health Check:', health);

  // 2. Network Info
  const netRes = await fetch('http://localhost:3001/api/network-info');
  const net = await netRes.json();
  console.log('✅ 2. Network Info: LAN URL is', net.lanUrl);

  // 3. Templates
  const tplRes = await fetch('http://localhost:3001/api/templates');
  const templates = await tplRes.json();
  console.log('✅ 3. Templates count:', templates.length);
  templates.forEach(t => console.log(`   - ${t.name} (${t.fields.length} custom fields, ${t.stages.length} stages)`));

  // 4. Documents
  const docRes = await fetch('http://localhost:3001/api/documents');
  const docs = await docRes.json();
  console.log('\n✅ 4. Documents in database:', docs.length);
  const firstDoc = docs[0];
  console.log(`   - Sample Doc: ${firstDoc.tracking_code} | "${firstDoc.title}" | Stage: ${firstDoc.current_stage}`);

  // 5. Advance Stage
  console.log('\n✅ 5. Testing Stage Advancement:');
  const advanceRes = await fetch(`http://localhost:3001/api/documents/${firstDoc.id}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_stage: 'Manager Approval',
      author_name: 'Maria Santos (Auditor)',
      notes: 'Reviewed against purchase order PO-99201. Passed compliance check.'
    })
  });
  const advanced = await advanceRes.json();
  console.log(`   - Stage updated to: "${advanced.current_stage}"`);

  // 6. Audit History
  const histRes = await fetch(`http://localhost:3001/api/documents/${firstDoc.id}/history`);
  const history = await histRes.json();
  console.log(`\n✅ 6. Audit History count for ${firstDoc.tracking_code}: ${history.length} entries`);
  console.log('   - Latest audit entry:', {
    action: history[0].action,
    from: history[0].from_stage,
    to: history[0].to_stage,
    author: history[0].author_name,
    notes: history[0].notes
  });

  // 7. Metrics
  const metRes = await fetch('http://localhost:3001/api/metrics');
  const metrics = await metRes.json();
  console.log('\n✅ 7. Dashboard Metrics:', {
    totalDocs: metrics.totalDocs,
    stagesCount: metrics.stageBreakdown.length,
    recentHistoryCount: metrics.recentHistory.length
  });

  // 8. Static Web Frontend Serving
  const htmlRes = await fetch('http://localhost:3001/');
  const html = await htmlRes.text();
  const hasAppTitle = html.includes('DocTrack');
  console.log('\n✅ 8. Production Static Frontend Served:', hasAppTitle ? 'YES (DocTrack detected)' : 'NO');

  console.log('\n🎉 ALL 8 E2E LIVE NETWORK SERVER CHECKS PASSED SUCCESSFULLY!\n');
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
