// Vercel Serverless Function
// Consulta WorldCup26 API gratis, sin API key.

export default async function handler(req, res) {
  try {
    const url = 'https://worldcup26.ir/get/games';

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        ok: false,
        error: 'Error consultando WorldCup26 API',
        details: text
      });
    }

    const data = await response.json();

    const rawGames = Array.isArray(data) ? data : data.data || data.response || data.games || [];

    const matches = rawGames.map(game => {
      const home =
        game.home_team_en ||
        game.home_team ||
        game.team1 ||
        game.home ||
        game.homeTeam ||
        game.team_home ||
        null;

      const away =
        game.away_team_en ||
        game.away_team ||
        game.team2 ||
        game.away ||
        game.awayTeam ||
        game.team_away ||
        null;

      const homeScore =
        game.home_score ??
        game.score1 ??
        game.homeScore ??
        game.goals_home ??
        game.home_goals ??
        null;

      const awayScore =
        game.away_score ??
        game.score2 ??
        game.awayScore ??
        game.goals_away ??
        game.away_goals ??
        null;

      const status =
        game.status ||
        game.match_status ||
        game.state ||
        '';

      const isFinished =
        String(status).toLowerCase().includes('finish') ||
        String(status).toLowerCase().includes('complete') ||
        String(status).toLowerCase() === 'ft' ||
        (homeScore !== null && awayScore !== null);

      const isLive =
        String(status).toLowerCase().includes('live') ||
        String(status).toLowerCase().includes('playing');

      return {
        apiId: game.id || game._id || game.match_id || null,
        date: game.date || game.match_date || game.datetime || null,
        venue: game.stadium || game.venue || null,
        city: game.city || null,
        home,
        away,
        homeScore,
        awayScore,
        statusShort: status || (isFinished ? 'FT' : 'NS'),
        statusLong: status || (isFinished ? 'Finished' : 'Not Started'),
        isFinished,
        isLive
      };
    }).filter(m => m.home && m.away);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    return res.status(200).json({
      ok: true,
      source: 'worldcup26.ir',
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