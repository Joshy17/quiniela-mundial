/* Lógica principal: navegación, puntos, renderizado y actualización automática.
   Los marcadores vienen desde /api/worldcup-results, que corre en Vercel. */

// ============================================================
// CONFIG
// ============================================================
const AUTO_SYNC_INTERVAL_MS = 60_000; // 1 minuto

// Aliases para unir los nombres de tu quiniela con los nombres de la API.
// Si algún partido no se actualiza, probablemente debes agregar aquí otro alias.
const TEAM_ALIASES = {
  'Mexico': ['Mexico', 'México'],
  'Corea del sur': ['South Korea', 'Korea Republic', 'Korea Rep', 'Corea del Sur'],
  'Rep.Checa': ['Czech Republic', 'Czechia', 'Czech Rep.'],
  'Sudafrica': ['South Africa', 'Sudáfrica'],
  'Canada': ['Canada', 'Canadá'],
  'Bosnia': ['Bosnia and Herzegovina', 'Bosnia-Herzegovina', 'Bosnia'],
  'Qatar': ['Qatar'],
  'Suiza': ['Switzerland', 'Suiza'],
  'Brasil': ['Brazil', 'Brasil'],
  'Marruecos': ['Morocco', 'Marruecos'],
  'Haiti': ['Haiti', 'Haití'],
  'Escocia': ['Scotland', 'Escocia'],
  'EEUU': ['USA', 'United States', 'United States of America', 'EEUU'],
  'Paraguay': ['Paraguay'],
  'Australia': ['Australia'],
  'Turkía': ['Turkey', 'Türkiye', 'Turquia', 'Turquía'],
  'Alemania': ['Germany', 'Alemania'],
  'Curacao': ['Curaçao', 'Curacao'],
  'Costa de marfil': ['Ivory Coast', "Côte d'Ivoire", 'Cote d Ivoire'],
  'Ecuador': ['Ecuador'],
  'Japón': ['Japan', 'Japón'],
  'Países Bajos': ['Netherlands', 'Holland', 'Países Bajos'],
  'Suecia': ['Sweden', 'Suecia'],
  'Tunez': ['Tunisia', 'Túnez', 'Tunez'],
  'Belgica': ['Belgium', 'Bélgica', 'Belgica'],
  'Egipto': ['Egypt', 'Egipto'],
  'Iran': ['Iran', 'IR Iran'],
  'Nueva Zelanda': ['New Zealand', 'Nueva Zelanda'],
  'Arabia Saudi': ['Saudi Arabia', 'Arabia Saudí', 'Arabia Saudi'],
  'Cabo Verde': ['Cape Verde', 'Cabo Verde'],
  'España': ['Spain', 'España'],
  'Uruguay': ['Uruguay'],
  'Francia': ['France', 'Francia'],
  'Irak': ['Iraq', 'Irak'],
  'Noruega': ['Norway', 'Noruega'],
  'Senegal': ['Senegal'],
  'Argelia': ['Algeria', 'Argelia'],
  'Argentina': ['Argentina'],
  'Austria': ['Austria'],
  'Jordania': ['Jordan', 'Jordania'],
  'Colombia': ['Colombia'],
  'Portugal': ['Portugal'],
  'República del congo': ['DR Congo', 'Congo DR', 'Democratic Republic of the Congo', 'Congo'],
  'Ubsgekistan': ['Uzbekistan', 'Uzbekistán'],
  'Croacia': ['Croatia', 'Croacia'],
  'Gana': ['Ghana', 'Gana'],
  'Inglaterra': ['England', 'Inglaterra'],
  'Panamá': ['Panama', 'Panamá']
};

// ============================================================
// STATE
// ============================================================
let matches = JSON.parse(JSON.stringify(MATCHES_RAW));
let apiState = {
  lastSync: null,
  lastError: null,
  updatedMatches: 0,
  apiMatches: 0
};

// ============================================================
// HELPERS API
// ============================================================
function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function aliasesFor(teamName) {
  const aliases = TEAM_ALIASES[teamName] || [teamName];
  return aliases.map(normalizeName);
}

function sameTeam(localTeam, apiTeam) {
  const apiNormalized = normalizeName(apiTeam);
  return aliasesFor(localTeam).includes(apiNormalized);
}

function sameMatch(localMatch, apiMatch) {
  const sameOrder = sameTeam(localMatch.team1, apiMatch.home) && sameTeam(localMatch.team2, apiMatch.away);
  const reversed = sameTeam(localMatch.team1, apiMatch.away) && sameTeam(localMatch.team2, apiMatch.home);
  return sameOrder || reversed;
}

function getResultFromScore(match, score1, score2) {
  if (score1 > score2) return match.team1;
  if (score2 > score1) return match.team2;
  return 'Empate';
}

function updateStatusText() {
  const el = document.getElementById('api-status');
  if (!el) return;

  if (apiState.lastError) {
    el.textContent = `Error: ${apiState.lastError}`;
    return;
  }

  if (!apiState.lastSync) {
    el.textContent = 'Todavía no se han consultado resultados.';
    return;
  }

  el.textContent = `Última actualización: ${apiState.lastSync.toLocaleString()} | Partidos encontrados en API: ${apiState.apiMatches} | Partidos actualizados en quiniela: ${apiState.updatedMatches}`;
}

async function syncResults(showMessage = false) {
  try {
    const response = await fetch('/api/worldcup-results');
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'No se pudo consultar la API');
    }

    let updated = 0;

    data.matches.forEach(apiMatch => {
      const localMatch = matches.find(m => sameMatch(m, apiMatch));
      if (!localMatch) return;

      const isReversed = sameTeam(localMatch.team1, apiMatch.away) && sameTeam(localMatch.team2, apiMatch.home);
      const s1 = isReversed ? apiMatch.awayScore : apiMatch.homeScore;
      const s2 = isReversed ? apiMatch.homeScore : apiMatch.awayScore;

      // Solo se actualiza si la API ya trae marcador numérico.
      if (typeof s1 !== 'number' || typeof s2 !== 'number') return;

      localMatch.score1 = s1;
      localMatch.score2 = s2;
      localMatch.apiStatus = apiMatch.statusShort;
      localMatch.apiStatusLong = apiMatch.statusLong;
      localMatch.isLive = apiMatch.isLive;

      // La tabla de puntos solo cuenta partidos finalizados.
      if (apiMatch.isFinished) {
        localMatch.result = getResultFromScore(localMatch, s1, s2);
      } else {
        localMatch.result = null;
      }

      updated++;
    });

    apiState = {
      lastSync: new Date(),
      lastError: null,
      updatedMatches: updated,
      apiMatches: data.count || 0
    };

    renderLeaderboard();
    renderMatchesList();
    updateStatusText();

    if (showMessage) showToast(`Resultados actualizados: ${updated} partidos`);
  } catch (error) {
    apiState.lastError = error.message;
    updateStatusText();
    if (showMessage) showToast(error.message, true);
  }
}

// ============================================================
// SCORING
// ============================================================
function calcScores() {
  const scores = {};
  MEMBERS.forEach(m => scores[m] = { pts: 0, correct: 0, total: 0 });

  matches.forEach(match => {
    if (match.result === null) return;
    MEMBERS.forEach(m => {
      scores[m].total++;
      if (match.picks[m] === match.result) {
        scores[m].pts++;
        scores[m].correct++;
      }
    });
  });
  return scores;
}

// ============================================================
// LEADERBOARD
// ============================================================
function renderLeaderboard() {
  const scores = calcScores();
  const sorted = MEMBERS.map(m => ({ name: m, ...scores[m] }))
    .sort((a, b) => b.pts - a.pts || b.correct - a.correct);

  const maxPts = sorted[0]?.pts || 1;
  const totalFinished = matches.filter(m => m.result !== null).length;
  const totalMatches = matches.length;
  const liveMatches = matches.filter(m => m.isLive).length;

  document.getElementById('lb-subtitle').textContent =
    `${totalFinished} de ${totalMatches} partidos finalizados${liveMatches ? ` | ${liveMatches} en vivo` : ''}`;

  const grid = document.getElementById('leaderboard-grid');
  grid.innerHTML = '';

  const trophies = ['🥇', '🥈', '🥉'];

  sorted.forEach((p, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const pct = maxPts > 0 ? (p.pts / maxPts) * 100 : 0;
    const initials = p.name.substring(0, 2).toUpperCase();
    const avClass = MEMBER_COLORS[MEMBERS.indexOf(p.name)];

    grid.innerHTML += `
      <div class="lb-card ${rankClass}">
        <div class="lb-rank">${rank <= 3 ? trophies[i] : rank}</div>
        <div class="lb-avatar ${avClass}">${initials}</div>
        <div class="lb-name">${p.name}</div>
        <div class="lb-bar-wrap">
          <div class="lb-bar"><div class="lb-bar-fill" style="width:${pct}%"></div></div>
          <div class="lb-correct">${p.correct}/${p.total} aciertos</div>
        </div>
        <div class="lb-stats">
          <div>
            <div class="lb-pts">${p.pts}</div>
            <div class="lb-pts-label">pts</div>
          </div>
        </div>
      </div>`;
  });
}

// ============================================================
// PARTIDOS
// ============================================================
let activeGroupFilter = 'todos';

function getGroups() {
  const groups = new Set();
  matches.forEach(m => { if (m.group) groups.add(m.group); });
  return Array.from(groups).sort();
}

function renderGroupFilters() {
  const groups = getGroups();
  const wrap = document.getElementById('group-filters');
  let html = `<button class="filter-btn active" onclick="filterGroup('todos', this)">Todos</button>`;
  groups.forEach(g => {
    html += `<button class="filter-btn" onclick="filterGroup('${g}', this)">Grupo ${g}</button>`;
  });
  wrap.innerHTML = html;
}

function filterGroup(group, btn) {
  activeGroupFilter = group;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMatchesList();
}

function renderMatchesList() {
  const list = document.getElementById('matches-list');

  let currentGroup = '';
  const groupedMatches = {};
  const groupOrder = [];
  matches.forEach(m => {
    if (m.group) currentGroup = m.group;
    const key = currentGroup || 'Extra';
    if (!groupedMatches[key]) { groupedMatches[key] = []; groupOrder.push(key); }
    groupedMatches[key].push(m);
  });

  const filtered = activeGroupFilter === 'todos' ? groupOrder : groupOrder.filter(g => g === activeGroupFilter);

  let html = '';
  filtered.forEach(g => {
    html += `<div class="group-section"><div class="group-title">Grupo ${g}</div>`;
    groupedMatches[g].forEach(m => {
      const hasScore = typeof m.score1 === 'number' && typeof m.score2 === 'number';
      const isFinished = m.result !== null;
      const s1 = hasScore ? m.score1 : '–';
      const s2 = hasScore ? m.score2 : '–';
      const badgeClass = isFinished ? 'badge-done' : (m.isLive ? 'badge-live' : 'badge-pending');
      const badgeTxt = isFinished ? 'Finalizado' : (m.isLive ? 'En vivo' : 'Pendiente');
      const cardClass = isFinished ? 'has-result' : 'no-result';
      const statusTxt = m.apiStatusLong ? `<small class="match-api-status">${m.apiStatusLong}</small>` : '';

      let picksHtml = '';
      MEMBERS.forEach((mem, mi) => {
        const pick = m.picks[mem] || '—';
        let icon = '⏳';
        let cls = 'pending';
        if (isFinished) {
          if (pick === m.result) { icon = '✓'; cls = 'yes'; }
          else { icon = '✗'; cls = 'no'; }
        }
        const avCls = MEMBER_COLORS[mi];
        picksHtml += `
          <div class="pick-item">
            <div class="lb-avatar ${avCls}" style="width:22px;height:22px;font-size:.7rem;flex-shrink:0">${mem.substring(0,2).toUpperCase()}</div>
            <div class="pick-val">${pick}</div>
            <div class="pick-correct ${cls}">${icon}</div>
          </div>`;
      });

      html += `
        <div class="match-card ${cardClass} collapsed" id="mc-${m.id}">
          <div class="match-main" onclick="toggleMatch(${m.id})">
            <div class="match-team">${m.team1}${statusTxt}</div>
            <div class="match-score">
              <div class="score-box">${s1}</div>
              <span class="score-sep">:</span>
              <div class="score-box">${s2}</div>
            </div>
            <div class="match-team right">${m.team2}</div>
            <span class="match-result-badge ${badgeClass}">${badgeTxt}</span>
            <span class="expand-hint">▾</span>
          </div>
          <div class="match-picks">${picksHtml}</div>
        </div>`;
    });
    html += '</div>';
  });

  list.innerHTML = html;
}

function toggleMatch(id) {
  const card = document.getElementById(`mc-${id}`);
  if (card.classList.contains('collapsed')) {
    card.classList.remove('collapsed');
    card.classList.add('expanded');
  } else {
    card.classList.remove('expanded');
    card.classList.add('collapsed');
  }
}

// ============================================================
// NAV
// ============================================================
function showPage(page, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (page === 'leaderboard') renderLeaderboard();
  if (page === 'partidos') renderMatchesList();
  if (page === 'estado') updateStatusText();
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (error ? ' error' : '');
  setTimeout(() => { t.classList.remove('show'); }, 3000);
}

// ============================================================
// INIT
// ============================================================
renderLeaderboard();
renderGroupFilters();
renderMatchesList();
updateStatusText();
syncResults(false);
setInterval(() => syncResults(false), AUTO_SYNC_INTERVAL_MS);
