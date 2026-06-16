// Vercel Serverless Function
// Consulta API-Football sin exponer la API key en el navegador.

export default async function handler(req, res) {
  const API_KEY = process.env.APIFOOTBALL_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Falta configurar APIFOOTBALL_KEY en las variables de entorno de Vercel.'
    });
  }

  try {
    const url = 'https://v3.football.api-sports.io/fixtures?league=1&season=2026';

    const response = await fetch(url, {
      headers: {
        'x-apisports-key': API_KEY
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        ok: false,
        error: 'Error consultando API-Football',
        details: text
      });
    }

    const data = await response.json();

    const matches = (data.response || []).map(item => {
      const statusShort = item.fixture?.status?.short || 'NS';
      const statusLong = item.fixture?.status?.long || 'Not Started';
      const finishedStatuses = ['FT', 'AET', 'PEN'];
      const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT'];

      return {
        apiId: item.fixture?.id,
        date: item.fixture?.date,
        venue: item.fixture?.venue?.name || null,
        city: item.fixture?.venue?.city || null,
        home: item.teams?.home?.name,
        away: item.teams?.away?.name,
        homeScore: item.goals?.home,
        awayScore: item.goals?.away,
        statusShort,
        statusLong,
        isFinished: finishedStatuses.includes(statusShort),
        isLive: liveStatuses.includes(statusShort)
      };
    });

    // Cache en Vercel/CDN: evita gastar requests por cada usuario.
    // Durante partidos en vivo puedes bajar s-maxage a 30 si necesitas más rapidez.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    return res.status(200).json({
      ok: true,
      source: 'api-football',
      updatedAt: new Date().toISOString(),
      count: matches.length,
      matches
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'Error interno consultando resultados',
      details: error.message
    });
  }
}
