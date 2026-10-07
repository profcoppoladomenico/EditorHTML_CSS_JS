# Bottega

Editor online di HTML, CSS e JavaScript con anteprima in tempo reale, pensato per la classe.
Non richiede registrazione e non usa server: è un sito statico che si pubblica gratis con GitHub Pages.

## Cosa fa

- Tre pannelli (HTML, CSS, JS) e il risultato che si aggiorna mentre si scrive, con console per `console.log` ed errori.
- **Salvataggio automatico** di ogni modifica nel browser. In "Progetti" si trovano tutti i lavori: aprire, duplicare, eliminare.
- **Condividi**: crea un link che contiene il codice. Chi lo apre vede risultato e codice in sola lettura e può salvarne una copia.
- **Scarica .html**: un unico file con CSS e JS dentro, che si apre con un doppio clic in qualsiasi browser.
- **Scarica .zip**: cartella con `index.html`, `style.css` e `script.js`, reimportabile in Bottega.
- **Importa**: accetta sia i .zip sia i .html (anche quelli scaricati da Bottega).

## Pubblicarla su GitHub Pages

1. Su github.com crea un nuovo repository pubblico, per esempio `bottega`.
2. Nella pagina del repository scegli **Add file › Upload files** e trascina **il contenuto** di questa cartella (`index.html`, `app.js`, `style.css`, la cartella `vendor` e questo README). Conferma con **Commit changes**.
3. Vai in **Settings › Pages**. In "Build and deployment" scegli **Deploy from a branch**, branch **main**, cartella **/ (root)**, e salva.
4. Dopo un minuto circa l'app è online all'indirizzo `https://TUO-NOME.github.io/bottega/`. È il link da dare agli studenti.

Per aggiornarla basta ricaricare i file modificati nel repository.

## Da sapere

- I progetti restano **nel browser e nel computer** dove sono stati scritti. Se uno studente cambia computer, usa la navigazione privata o cancella i dati del browser, li perde: fategli scaricare il .zip o il .html a fine lezione.
- Il link di condivisione è una "foto" del progetto nel momento in cui viene creato: dopo altre modifiche serve un link nuovo. Per progetti molto grandi il link diventa lungo; in quel caso conviene condividere il file .html.
- L'editor e le librerie interne sono inclusi nella cartella `vendor`, quindi l'app funziona anche se un sito esterno è bloccato dalla rete della scuola. Da internet arrivano solo i caratteri tipografici, che hanno comunque un'alternativa di sistema.

## Contenuto

- `index.html`, `style.css`, `app.js`: l'app.
- `vendor/`: CodeMirror 5.65.16 (editor), JSZip 3.10.1 (file .zip), lz-string 1.5.0 (compressione dei link). Sono tutte librerie open source con licenza MIT.
