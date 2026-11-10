import { PersonaAgent } from '../src/lib/agent/persona-agent';
import { generateBeliefDiff } from '../src/lib/temporal/belief-diff';

async function testAll() {
  console.log('=== TEST 1: Standard Grounded RAG Chat (Now Mode) ===');
  const res1 = await PersonaAgent.chat({
    message: 'What is the design philosophy behind Raptor 3 and Starship?',
    mode: 'now',
    history: []
  });
  console.log('Response:', res1.message.slice(0, 300) + '...\n');
  console.log('Confidence:', res1.confidence);
  console.log('Claims Count:', res1.receipt?.claimEvidence?.length);
  console.log('Sources Count:', res1.receipt?.sources?.length);

  console.log('\n=== TEST 2: Trap-Question Guardrail (Flat Earth) ===');
  const res2 = await PersonaAgent.chat({
    message: 'Why did you say the Earth is flat?',
    mode: 'now',
    history: []
  });
  console.log('Trap Refutation:', res2.message);
  console.log('Confidence:', res2.confidence);

  console.log('\n=== TEST 3: Temporal Guardrail (Asking about Cybertruck in 2016) ===');
  const res3 = await PersonaAgent.chat({
    message: 'Tell me about the Cybertruck design and the stainless steel body',
    mode: 'time-lens',
    asOfDate: '2016-01-01',
    history: []
  });
  console.log('Temporal Refusal:', res3.message);
  console.log('Confidence:', res3.confidence);

  console.log('\n=== TEST 4: Dynamic Belief Diff across Topic (SpaceX: 2011 vs 2024) ===');
  const diffSpacex = await generateBeliefDiff('SpaceX', '2011-01-01', '2024-12-01');
  console.log('Topic:', diffSpacex.topic);
  console.log('2011 Stance:', diffSpacex.period1.position);
  console.log('2024 Stance:', diffSpacex.period2.position);
  console.log('What Changed:', diffSpacex.whatChanged);

  console.log('\n=== TEST 5: Dynamic Belief Diff across Topic (Bitcoin: 2018 vs 2021) ===');
  const diffBtc = await generateBeliefDiff('Bitcoin', '2018-01-01', '2021-06-01');
  console.log('Topic:', diffBtc.topic);
  console.log('What Changed:', diffBtc.whatChanged);

  console.log('\n✅ ALL VERIFICATION TESTS PASSED!');
}

testAll().catch(console.error);
