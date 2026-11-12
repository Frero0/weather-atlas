# Meteo PWA

Proprietario del progetto: **Federico Santorsola**.

App meteo con ricerca delle città, scelta della località, temperatura in gradi Celsius, condizioni in italiano, temperatura percepita, vento e umidità. Mantiene lo sfondo fotografico del progetto e usa un’immagine locale.

## Avvio

```sh
npm start
```

Apri http://localhost:3016. La versione compilata è già disponibile nella cartella `dist`.

## Uso e consultazione offline

Cerca una città e selezionala dai risultati. La pagina recupera i dati da Open-Meteo e salva l’ultima località nel browser. L’orario mostrato è l’ora locale della città restituita dal servizio.

Dopo il primo caricamento completo, il service worker conserva pagina, codice, stile, icona e sfondo. Senza connessione puoi riaprire la pagina e leggere l’ultima località salvata. La pagina segnala chiaramente «Ultime informazioni salvate» e non presenta i valori memorizzati come un nuovo aggiornamento. Per nuove ricerche e aggiornamenti serve Internet. Se il browser impedisce il salvataggio, compare un avviso.

La pagina offline è in italiano. La memorizzazione dipende dallo spazio e dalle impostazioni del browser; cancellare i dati del sito rimuove anche i dati salvati.

## Installazione

Nei browser compatibili puoi installare la PWA dal menu del browser. Quando il browser propone l’installazione, la pagina mostra anche **Installa l’app meteo**. In locale usa l’indirizzo localhost; per ospitarla altrove è necessario HTTPS. Dopo una ricompilazione, chiudi tutte le schede dell’app e riaprila per attivare il nuovo service worker.

## Modifiche e compilazione

```sh
npm install
npm run build
```

Il progetto usa React ed esbuild. La compilazione assegna alla cache una versione basata sui file generati. Il service worker conserva solo i file dell’app, non intercetta i servizi meteo esterni e rimuove esclusivamente le vecchie cache di questo progetto.

Non sono richieste chiavi API. Le vecchie credenziali incorporate sono state rimosse. Fonti: https://open-meteo.com/ e https://www.geonames.org/.
