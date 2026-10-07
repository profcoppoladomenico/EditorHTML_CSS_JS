# EditorHTML_CSS_JS

Editor di HTML, CSS e JavaScript con anteprima in tempo reale, per il lavoro in classe su PC condivisi.
È un sito statico pubblicato con GitHub Pages: niente account, niente dati salvati online.

## Come funziona

- **Durante il lavoro** il progetto si salva da solo nella scheda del browser. Se l'alunno ricarica la pagina per sbaglio, ritrova tutto.
- **Alla chiusura** della scheda o del browser il progetto sparisce, e chi apre l'editor dopo trova l'esempio iniziale.
- **Avviso prima di chiudere**: se ci sono modifiche non ancora scaricate, il browser chiede conferma.
- **Scarica** offre il file **.html** (un'unica pagina con CSS e JS dentro, che si apre in qualsiasi browser), il file **.zip** (`index.html`, `style.css`, `script.js`) oppure entrambi insieme, da caricare nel proprio Drive e consegnare su Classroom.
- **Importa** riapre un .html o un .zip, per riprendere un lavoro dal proprio Drive.
- **Nuovo** e **Importa** chiedono conferma prima di sostituire il progetto aperto e offrono di scaricarlo prima.

## File da caricare su GitHub

`index.html`, `app.js`, `style.css`, `librerie.js` e questo `README.md`.
`librerie.js` contiene CodeMirror 5.65.16 (l'editor) e JSZip 3.10.1 (i file .zip), entrambe con licenza MIT.

## Da sapere

- Il file .html scaricato contiene in fondo una copia del codice, in un blocco che il browser non esegue. Serve a Importa per riaprire il progetto esattamente com'era.
- Se il browser è impostato per riaprire le schede della sessione precedente e viene riaperto dopo pochi minuti, il progetto potrebbe ricomparire. Con le impostazioni normali dei PC di scuola non succede.
