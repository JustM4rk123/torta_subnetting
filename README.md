# Torta del subnetting

La Torta del subnetting è una piccola applicazione web per pianificare e
visualizzare la suddivisione di una rete IPv4 in sottoreti.

## Come funziona

1. Inserisci l'indirizzo e il prefisso CIDR della **rete di partenza**.
   L'indirizzo deve essere allineato al prefisso. Quando possibile, il primo
   ottetto dell'indirizzo propone automaticamente un prefisso iniziale.
2. Per ogni sottorete inserisci un nome, l'indirizzo di rete e il prefisso.
   Il nome può contenere "link" per impostare automaticamente il prefisso
   `/30`, utile per i collegamenti punto-punto.
3. La torta mostra la porzione di indirizzi occupata da ciascuna sottorete
   rispetto alla rete di partenza. Al centro trovi il totale degli indirizzi
   utilizzati.
4. I blocchi liberi sono suddivisi in intervalli CIDR allineati; viene
   evidenziato anche il blocco libero più grande.

L'applicazione segnala indirizzi IPv4 o prefissi non validi, reti fuori dalla
rete di partenza, indirizzi non allineati e sottoreti sovrapposte. Le modifiche
ai campi aggiornano la visualizzazione in tempo reale.

## Gestione delle reti

- **Aggiungi rete** crea una riga. Se il nome precedente termina con un numero,
  il numero viene incrementato per il nuovo nome.
- **Svuota indirizzi** cancella indirizzi e prefissi, mantenendo i nomi.
- **Resetta lista** ripristina una sola riga vuota, chiamata `LAN1`.
- Il pulsante `×` rimuove la riga corrispondente.
