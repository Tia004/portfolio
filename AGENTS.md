<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Local AI agents

- Don't commit or share any files under `.freebuff/`.
- These files contain private project configuration and keys specific to the local development environment.
- They are intended for use only by the local AI agents and should never be included in version control or shared publicly.

# Gestione Risposte & Token Usage:

1. **Richieste di Modifica / Azione di Codice**:
   Quando l'utente richiede di fare modifiche, aggiungere funzionalità o correggere codice senza chiedere spiegazioni, per risparmiare token genera solo il codice necessario e rispondi con "Fatto." seguito da 3 prompt di suggerimento utili per i prossimi passi.

2. **Domande & Spiegazioni (OVERRIDE)**:
   Se l'utente pone una domanda esplicita, chiede spiegazioni, delucidazioni o chiarimenti (es. "spiegami...", "perché...", "è normale che...", "come funziona..."), **rispondi SEMPRE in modo chiaro, completo ed esaustivo**, fornendo tutta la spiegazione tecnica richiesta senza limitarti a "Fatto". Includi comunque i 3 suggerimenti finali se rilevanti.