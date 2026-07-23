<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Local AI agents

- Don't commit or share any files under `.freebuff/`.
- These files contain private project configuration and keys specific to the local development environment.
- They are intended for use only by the local AI agents and should never be included in version control or shared publicly.

# Per restringere la token usage:

Ogni volta che io ti faccio un prompt, per risparmiare token, ho bisogno che tu non generi nessun testo di risposta e nessun testo che mi indichi qualcosa a me, genera solo il testo che ti serve dire per te stesso, in modo da ragionare, ma per il resto non fare nulla, e genera solo il codice di modifica o in aggiunta o eliminazione, e quando hai finito scrivimi "Fatto" e basta, sarò io a chiederti cosa hai fatto con un altro prompt se proprio voglio saperlo.
