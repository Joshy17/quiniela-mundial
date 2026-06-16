// Vercel Serverless Function
// Consulta ESPN pública, gratis y sin API key.

function buildDates(start, end) {
  const dates = [];
  const current = new Date(start);

  while (current <= new Date(end)) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${y}${m}${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function normalizeTeamName(name) {
  const map = {
    'Czechia': 'Rep.Checa',
    'South Korea': 'Corea del sur',
    'South Africa': 'Sudafrica',
    'United States': 'EEUU',
    'Turkey': 'Turkía',
    'Ivory Coast': 'Costa de marfil',
    'Netherlands': 'Países Bajos',
    'Tunisia': 'Tunez',
    'Belgium': 'Belgica',
    'Iran': 'Iran',
    'Saudi Arabia': 'Arabia Saudi',
    'Cape Verde': 'Cabo Verde',
    'Iraq': 'Irak',
    'Algeria': 'Argelia',
    'Jordan': 'Jordania',
    'DR Congo': 'República del congo',
    'Uzbekistan': 'Ubsgekistan',
    'England': 'Inglaterra',
    'Croatia': 'Croacia',
    'Ghana': 'Gana',
    'Panama': 'Panamá',
    'Morocco': 'Marruecos',
    'Haiti': 'Haiti',
    'Scotland': 'Escocia',
    'Switzerland': 'Suiza',
    'Japan': 'Japón',
    'Spain': 'España',
    'Germany': 'Alemania',
    'France': 'Francia',
    'Norway': 'Noruega',
    'Argentina': 'Argentina',
    'Portugal': 'Portugal',
    'Colombia': 'Colombia',
    'Uruguay': 'Uruguay',
    'Australia': 'Australia',
    'Canada': 'Canada',
    'Qatar': 'Qatar',
    'Mexico': 'Mexico',
    'Brazil': 'Brasil',
    'Ecuador': 'Ecuador',
    'Sweden': 'Suecia',
    'Egypt': 'Egipto',
    'New Zealand': 'Nueva Zelanda',
    'Senegal': 'Senegal',
    'Austria': 'Austria'
  };

  return map[name] || name;
}

export default async function handler(req, res) {
  try {
    const dates = buildDates('2026-06-11', '2026-06-27');

    const requests = dates.map(date =>
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}`)
        .then(r => r.json())
        .catch(() => ({ events: [] }))
    );

    const results = await Promise.all(requests);

    const matches = [];

    results.forEach(data => {
      const events = data.events || [];

      events.forEach(event => {
        const competition = event.competitions?.[0];
        if (!competition) return;

        const status = competition.status?.type || event.status?.type || {};
        const competitors = competition.competitors || [];

        const home = competitors.find(c => c.homeAway === 'home');
        const away = competitors.find(c => c.homeAway === 'away');

        if (!home || !away) return;

        const homeName = normalizeTeamName(home.team?.displayName);
        const awayName = normalizeTeamName(away.team?.displayName);

        const isFinished = status.completed === true;
        const isLive = status.state === 'in';

        const homeScore = (isFinished || isLive) ? Number(home.score ?? 0) : null;
        const awayScore = (isFinished || isLive) ? Number(away.score ?? 0) : null;

        matches.push({
          apiId: event.id,
          date: event.date,
          venue: competition.venue?.fullName || event.venue?.displayName || null,
          city: competition.venue?.address?.city || null,
          home: homeName,
          away: awayName,
          homeScore,
          awayScore,
          statusShort: status.name || '',
          statusLong: status.description || '',
          isFinished,
          isLive
        });
      });
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    return res.status(200).json({
      ok: true,
      source: 'espn',
      updatedAt: new Date().toISOString(),
      count: matches.length,
      matches
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'Error interno consultando ESPN',
      details: error.message
    });
  }
}