/* ============================================================
   sources.js — la "carte des sources" (Source Map)
   ------------------------------------------------------------
   Ici tu déclares, match par match ou championnat par championnat,
   la source de diffusion OFFICIELLE ou AUTORISÉE :
     - une chaîne/vidéo YouTube officielle d'un club, d'une ligue, d'une fédération
     - une chaîne Twitch officielle
     - une source pour laquelle tu as un accord écrit du détenteur des droits

   Si un match n'a aucune règle ici, le site affiche "No signal"
   avec les liens vers les diffuseurs officiels.

   Règles de correspondance (toutes celles que tu écris doivent être vraies) :
     id        : identifiant exact du match (API-Sports)
     league    : nom du championnat (ex : "Ligue 1")
     country   : pays du championnat (ex : "Tunisia")
     home/away : texte contenu dans le nom de l'équipe
     from/to   : dates "YYYY-MM-DD" (optionnel)

   Sources possibles (une seule par règle) :
     embed          : lien YouTube ou Twitch
     youtubeChannel : identifiant de chaîne YouTube (commence par UC...) :
                      affiche le direct en cours de cette chaîne

   N'ajoute que des sources dont tu as le droit de réutiliser le flux.
   ============================================================ */
window.ARENA_SOURCES = [
  // EXEMPLES (retire les "//" et remplace par tes vraies sources) :
  //
  // { league: "Ligue 1", country: "Tunisia",
  //   youtubeChannel: "UCxxxxxxxxxxxxxxxxxxxxxx", label: "Chaîne officielle" },
  //
  // { home: "Espérance", away: "Club Africain",
  //   embed: "https://www.youtube.com/watch?v=XXXXXXXXXXX", label: "Diffuseur officiel" },
  //
  // { id: 1234567, embed: "https://www.twitch.tv/nom_de_chaine", label: "Twitch officiel" }
];
