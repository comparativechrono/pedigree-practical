/* =====================================================================
   The table of standard pedigree symbols, drawn with the same shapes
   as Pedigree Studio. Put <table class="symtab" data-symbols="all">
   (or data-symbols="basic") in the page.
   ===================================================================== */
(function () {
  'use strict';
  const S = '#1a2332';
  const sq = (x, y, fill) => `<rect x="${x}" y="${y}" width="22" height="22" fill="${fill || '#fff'}" stroke="${S}" stroke-width="2"/>`;
  const ci = (x, y, fill) => `<circle cx="${x + 11}" cy="${y + 11}" r="11" fill="${fill || '#fff'}" stroke="${S}" stroke-width="2"/>`;
  const di = (x, y, fill) => `<path d="M${x + 11} ${y - 1} L${x + 23} ${y + 11} L${x + 11} ${y + 23} L${x - 1} ${y + 11}Z" fill="${fill || '#fff'}" stroke="${S}" stroke-width="2"/>`;
  const tri = (x, y, fill) => `<path d="M${x + 11} ${y + 2} L${x + 22} ${y + 21} L${x} ${y + 21}Z" fill="${fill || '#fff'}" stroke="${S}" stroke-width="2"/>`;
  const line = (x1, y1, x2, y2, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S}" stroke-width="${w || 2}"/>`;
  const dash = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S}" stroke-width="2" stroke-dasharray="4 3"/>`;
  const txt = (x, y, t, size) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${size || 12}" font-weight="700" fill="${S}" font-family="system-ui,sans-serif">${t}</text>`;
  const small = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="8.5" fill="#384355" font-family="system-ui,sans-serif">${t}</text>`;
  const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;
  const arrow = (x, y) => `<path d="M${x} ${y + 12} L${x + 11} ${y + 1} M${x + 11} ${y + 1} L${x + 5} ${y + 1} M${x + 11} ${y + 1} L${x + 11} ${y + 7}" stroke="${S}" stroke-width="1.8" fill="none"/>`;
  const brackets = (x, y) => `<path d="M${x + 5} ${y - 3} H${x - 1} V${y + 25} H${x + 5} M${x + 17} ${y - 3} H${x + 23} V${y + 25} H${x + 17}" stroke="${S}" stroke-width="2" fill="none"/>`;
  const dot = (x, y) => `<circle cx="${x + 11}" cy="${y + 11}" r="3.6" fill="${S}"/>`;
  const slash = (x, y) => line(x - 3, y + 25, x + 25, y - 3);

  const ROWS = {
    basic: [
      ['Man or boy · woman or girl · sex unknown or not stated', svg(100, 30, sq(4, 4) + ci(38, 4) + di(73, 4)), 'The symbol shows the person’s gender. Since 2022 the recommendation is to note sex assigned at birth underneath when it matters clinically (AFAB, AMAB). A diamond is also used for non-binary people.'],
      ['Affected', svg(100, 30, sq(4, 4, S) + ci(38, 4, S) + di(73, 4, S)), 'Shade the symbol. With more than one condition, use colours or quarters and explain them in a key.'],
      ['Several people', svg(70, 30, sq(4, 4) + txt(15, 15, '3') + ci(40, 4) + txt(51, 15, 'n')), 'A number inside, or n if the number is not known.'],
      ['Deceased', svg(70, 30, sq(4, 4) + slash(4, 4) + ci(40, 4) + slash(40, 4)), 'A diagonal line through the symbol. Write the age at death and the cause underneath.'],
      ['Proband', svg(60, 34, arrow(2, 18) + sq(22, 6)), 'An arrow at the lower left: the person the pedigree is drawn for (often the person in front of you).'],
      ['Carrier', svg(40, 30, ci(9, 4) + dot(9, 4)), 'A dot inside: carries a variant but is not affected and is not expected to be.'],
      ['Pregnancy', svg(70, 30, di(9, 4) + txt(20, 15, 'P') + sq(40, 4) + txt(51, 15, 'P')), 'P inside. Use a square or circle if the sex is known. Write the weeks of pregnancy underneath.'],
      ['Pregnancy loss', svg(80, 30, tri(4, 4) + tri(42, 4, S)), 'A small triangle (shaded if affected). Termination of pregnancy adds a diagonal line; a stillbirth uses the baby’s symbol with a diagonal line and SB.']
    ],
    lines: [
      ['Partners', svg(80, 30, sq(4, 4) + line(26, 15, 50, 15) + ci(50, 4)), 'A horizontal relationship line. Where possible the man is on the left.'],
      ['Separated or divorced', svg(80, 30, sq(4, 4) + line(26, 15, 50, 15) + line(33, 22, 37, 8) + line(39, 22, 43, 8) + ci(50, 4)), 'Two short slashes across the relationship line.'],
      ['Partners related by blood (consanguineous)', svg(80, 30, sq(4, 4) + line(26, 12, 50, 12) + line(26, 18, 50, 18) + ci(50, 4)), 'A double line. If the shared ancestors are not drawn, write how the partners are related above the line.'],
      ['Children', svg(110, 66, sq(18, 2) + line(40, 13, 68, 13) + ci(68, 2) + line(54, 13, 54, 32) + line(20, 32, 90, 32) + line(20, 32, 20, 42) + line(55, 32, 55, 42) + line(90, 32, 90, 42) + sq(9, 42) + ci(44, 42) + sq(79, 42)), 'A line of descent from the relationship line to a sibship line. Brothers and sisters go from oldest on the left to youngest on the right.'],
      ['Identical (monozygotic) twins', svg(80, 66, line(40, 4, 40, 22) + line(40, 22, 20, 42) + line(40, 22, 60, 42) + line(30, 32, 50, 32) + sq(9, 42) + sq(49, 42)), 'The twins’ lines meet at one point, with a bar between them.'],
      ['Non-identical (dizygotic) twins', svg(80, 66, line(40, 4, 40, 22) + line(40, 22, 20, 42) + line(40, 22, 60, 42) + sq(9, 42) + ci(49, 42)), 'The lines meet at one point, without a bar.'],
      ['Adopted in · adopted out', svg(110, 60, line(26, 4, 26, 28) + dash(26, 4, 26, 28) + brackets(15, 32) + ci(15, 32) + line(84, 4, 84, 28) + brackets(73, 32) + sq(73, 32)), 'Brackets around the symbol. Adopted into the family: a dashed line to the adoptive parents. Adopted out: a solid line to the birth parents.'],
      ['No children · infertility', svg(100, 40, line(25, 4, 25, 26) + line(13, 26, 37, 26) + line(75, 4, 75, 22) + line(63, 22, 87, 22) + line(63, 29, 87, 29)), 'One bar: no children by choice or for a reason not known. Two bars: infertility. Write the reason underneath if it is known.']
    ]
  };

  function build(table) {
    const which = table.dataset.symbols || 'all';
    const sets = which === 'all' ? ['basic', 'lines'] : which.split(',');
    let html = '<thead><tr><th>Symbol</th><th>Meaning</th><th>Notes</th></tr></thead><tbody>';
    sets.forEach((k) => (ROWS[k] || []).forEach(([name, pic, note]) => { html += `<tr><td class="sym">${pic}</td><td><b>${name}</b></td><td>${note}</td></tr>`; }));
    table.innerHTML = html + '</tbody>';
  }
  document.querySelectorAll('table[data-symbols]').forEach(build);
})();
