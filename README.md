# Pedigrees: drawing, inheritance and ethics

**A practical in taking a family history, drawing it as a pedigree, recognising how a condition is inherited and thinking through the ethical problems that follow, in one web page with Pedigree Studio built in.**

The tutorial is on the left of the screen and a workbench is on the right. The workbench has two tabs:

- **Pedigree:** [Pedigree Studio](https://github.com/comparativechrono/PedigreeStudio), the drawing tool, with a list above it of the pedigrees students draw themselves and the families used in the tutorial.
- **Inheritance:** a pair of parents, their eggs and sperm, and the four equally likely children, for autosomal recessive, autosomal dominant and X-linked inheritance, with a calculator for the chance that a baby is affected.

Students install nothing. Their drawings, answers and interviews are saved in their own browser. It is a static site (HTML, CSS and JavaScript with no build step), so it can be hosted on **GitHub Pages** for free.

---

## Contents

1. [What's in the practical](#whats-in-the-practical)
2. [Put it on GitHub Pages](#put-it-on-github-pages)
3. [Try it on your own computer](#try-it-on-your-own-computer)
4. [Editing the tutorial](#editing-the-tutorial)
5. [Families: `data/pedigrees/`](#families-datapedigrees)
6. [Interviews: `data/interviews/`](#interviews-datainterviews)
7. [Settings: `config.js`](#settings-configjs)
8. [Pedigree Studio in this practical](#pedigree-studio-in-this-practical)
9. [Files](#files)
10. [Privacy and data](#privacy-and-data)
11. [Browser support](#browser-support)
12. [Notes for teaching staff](#notes-for-teaching-staff)
13. [Credits and licences](#credits-and-licences)

---

## What's in the practical

| # | Chapter | Based on | Time |
|---|---------|----------|------|
| 0 | **Start here**: how the page works; a first pedigree of three generations built with *Add a relative* | | 10 min |
| 1 | **Why a pedigree?** What a family history is for, who uses pedigrees, and the features that suggest a genetic cause | Workshop, part 1 | 10 min |
| 2 | **Symbols**: the standard symbols (NSGC 2008, with the 2022 update on sex and gender), drawing each one in the Studio, what to write under a symbol, and reading a pedigree someone else has drawn (the Okafor family) | Workshop, part 1 | 25 min |
| 3 | **Family history**: what to collect and how to ask, emotions and difficult situations, then two simulated interviews. Students question Abena Mensah (her brother's sudden death and hypertrophic cardiomyopathy) and Megan Price (breast and ovarian cancer), draw each family as they go and check their drawing automatically | Workshop, part 2 | 45 min |
| 4 | **Inheritance**: recessive, dominant and X-linked inheritance on the Inheritance tab; the workshop's cystic fibrosis (1 in 150, then 1 in 12 with consanguinity) and *BRCA2* scenarios; four families to classify; obligate carriers; segregation analysis and variants of uncertain significance | Workshop, part 3 | 45 min |
| 5 | **Ethics**: the lecture's five scenarios, each with its pedigree (non-disclosure in Lynch syndrome, testing by proxy in Huntington's disease, testing children, reproductive decisions, an unexpected finding from a genome); consent, confidentiality and the UK GDPR; ways of reasoning about ethics; eugenics | Ethics lecture | 45 min |
| R | **Reference**: symbols, Studio controls, glossary, notes for staff, sources | | |

The practical stands on its own. It is based on the programme's family history workshop and ethics lecture (the *Based on* column), but the text never refers back to them, so it works with or without those sessions.

Students get feedback as they go:

- **Steps tick themselves** when the page sees them done: a proband marked, a separated couple, identical twins, a key, the right cross on the Inheritance tab, every important interview question asked. Most steps also have a **▶ show me** button.
- **Questions** are short answers checked automatically, multiple choice with an explanation for every option, free text with a model answer, and **pick** questions, in which students click people on the pedigree (for example, everyone with a 1 in 2 chance of carrying the family's variant). *Show answer* on a pick question outlines the right people in green.
- **Check my pedigree** compares a student's drawing with the family it should show, person by person: missing or extra people, the wrong sex, shading, deceased, proband, carrier, pregnancy, adoption, relationships (double or separated lines) and twins. People to fix are outlined in orange. It does not mark the notes under the symbols or the exact layout.
- **Interviews** offer good and poorly worded questions side by side. A poor question (leading, a euphemism, a careless “great”) gets an answer that shows the problem, and a note on how to ask it better.

**My answers** (top right) downloads everything as an HTML file to keep or hand in: answers, interview transcripts and pictures of the pedigrees the student drew.

---

## Put it on GitHub Pages

1. Put the files in a GitHub repository (this one is `comparativechrono/pedigree-practical`). It must be public unless your GitHub plan supports Pages for private repositories. `index.html` must be at the top level, with `assets/`, `data/` and `studio/` beside it.
2. Go to **Settings → Pages**. Under *Build and deployment* choose **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, then **Save**.
3. After a minute or two the site is live at `https://comparativechrono.github.io/pedigree-practical/`. Give students that one link.

Any later change goes live a minute or so after it is committed.

> The empty `.nojekyll` file tells GitHub Pages to serve the files exactly as they are. It is harmless if it gets left out.

The whole site is under 1 MB.

---

## Try it on your own computer

Browsers block the drawing tool when the page is opened straight from disk (`file://…`), so use a small local web server:

```bash
cd pedigree-practical
python3 serve.py          # or: python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Useful addresses:

- `…/index.html#ethics` opens a chapter directly. The chapter ids are `start`, `why`, `symbols`, `history`, `inheritance`, `ethics` and `reference`. Headings with an id can be linked to as well, e.g. `#eth-hd`.
- `…/index.html?answers` shows the **Show answer** buttons even when they are switched off in `config.js`, which is handy for demonstrating in class.
- `…/studio/index.html` is Pedigree Studio on its own, for drawing without the tutorial.

---

## Editing the tutorial

All the tutorial text is in **`index.html`**, as ordinary HTML. You can edit it in any text editor, or directly on GitHub with the pencil icon.

### Chapters

```html
<section class="chapter" id="inheritance" data-num="4" data-title="Inheritance" data-bench="inherit" data-ped="cf" hidden>
  <h1>Patterns of inheritance</h1>
  …
</section>
```

- `id` is the address (`#inheritance`).
- `data-num` and `data-title` build the chapter buttons at the top.
- `data-bench` picks the workbench tab that opens with the chapter: `pedigree` or `inherit`.
- `data-ped` is the pedigree the Studio opens with the chapter (an id from `config.js`).
- Every chapter except the first has `hidden`.

### Activities and tick boxes

```html
<div class="activity" data-ped="practice">
  <div class="act-t">Activity 2.1 · People <button class="btn small" type="button" data-ped="practice">Open my practice pedigree</button></div>
  <ol class="steps">
    <li data-task="y-proband" data-check="has:proband">
      Select one person and switch on <b>Proband (arrow and P)</b> in the panel.
      <button class="do showme" type="button" data-studio="flash:#probandToggle">show me</button>
    </li>
  </ol>
</div>
```

Every `<li data-task="unique-id">` gets a *done* tick box, which feeds the progress bar. A step can also tick itself:

- **`data-check="name:arg"`** ticks when a check on the drawing passes. Checks run after every change, on the pedigree named by the nearest `data-ped` (the activity's, or else the chapter's), and only while that pedigree is open. Separate alternatives with `||`.
- **`data-auto="event key=value"`** ticks when the page reports an event. Operators are `=` (equals, ignoring case), `~` (contains), `>` and `<` (numbers). Several conditions separated by spaces must all match; separate alternatives with `||`.

Steps only tick themselves in the chapter the student is reading.

<details>
<summary><b>Checks you can use in <code>data-check</code></b></summary>

| Check | Passes when the pedigree has… |
|-------|-------------------------------|
| `open:draw-mensah` | (that pedigree is the one open) |
| `has:female&proband` | someone who matches every condition joined by `&`: `male`, `female`, `unknown`, `loss`, `deceased`, `affected`, `proband`, `carrier`, `pregnancy`, `multiple`, `adopted`, `named` (has notes), `text~dx` (notes contain “dx”), and `not-…` of any of these, e.g. `not-affected` |
| `count:14` | at least 14 people |
| `couple:any` · `couple:consanguineous` · `couple:separated` | a couple of that kind |
| `children:2` | a couple with at least 2 children |
| `twins:any` · `twins:identical` · `twins:nonidentical` | twins of that kind |
| `dashed` | a dashed line of descent (adopted in) |
| `lineSymbol` | a no-children or infertility bar |
| `key` | the colour key showing, with at least one entry filled in |
| `label` | a text label |
| `generations:3` | people in at least 3 rows |
| `probandPartner` · `probandParents` · `grandparents` | the proband with a partner · with parents · with both sets of grandparents |
| `probandChildren:4` · `probandSiblings:2` | the proband with at least 4 children (including pregnancies and losses) · at least 2 brothers or sisters |
| `matches:draw-mensah` | the last *Check my pedigree* of that drawing passed |
| `inherit.cross:ar,1,1` · `inherit.cross:ar,1,1,unaffected` | the Inheritance tab shows that cross (see `data-inherit` below) |
| `inherit.calc:1/150` | the calculator on the Inheritance tab gives that answer |

The checks are in `assets/js/bench.js` (`CHECKS`) and `assets/js/inherit.js` (`check`).

</details>

<details>
<summary><b>Events you can use in <code>data-auto</code></b></summary>

| Event | Keys |
|-------|------|
| `ped:open` | `id` (a pedigree id from `config.js`) |
| `ped:change` | `id` |
| `ped:compared` | `id`, `expect`, `ok` |
| `studio:add` | `shape` (`male`, `female`, `unknown`, `miscarriage`, `adopted-male`, `no-offspring`, `infertile`, `label`, …), `ped` |
| `studio:quick-add` | `kind` (`partner`, `son`, `daughter`, `parents`, `brother`, `sister`, `child`), `ped` |
| `studio:key` | `visible`, `ped` |
| `studio:tidy` | `ped` |
| `iv:asked` | `iv` (interview id), `id` (question id), `topic`, `key`, `poor`, `count` (important questions asked so far) |
| `iv:done` | `iv` (every important question in that interview has been asked) |
| `inherit:cross` | `pattern` (`ar`, `ad`, `xl`), `mother`, `father`, `unaffected` |
| `inherit:calc` | `mode`, `p1`, `p2`, `p`, `result` (e.g. `1/150`) |
| `q:checked` | `id` (question id), `ok` |
| `app:chapter` | `id` |

Examples: `data-auto="ped:open id=okafor"`, `data-auto="iv:done iv=mensah"`, `data-auto="studio:quick-add kind=parents"`.

</details>

### Questions

**Short answer, checked automatically:**

```html
<div class="q" data-q="y-ok-proband" data-accept="chidi" data-hint="look for the arrow">
  <div class="q-text">What is the name of the proband?</div>
  <div class="q-model"><p><b>Chidi</b>, aged 7: the arrow is at the lower left of his symbol.</p></div>
</div>

<div class="q" data-q="i-cf-baby" data-prob="1/150" data-hint="multiply the three chances">
  <div class="q-text">What is the chance that David and Lisa's baby has cystic fibrosis?</div>
  <div class="q-model"><p>2/3 × 1/25 × 1/4 = <b>1 in 150</b>.</p></div>
</div>
```

- `data-q` is a unique id. Answers are saved under it, so don't change it once students have started.
- `data-accept` holds one or more regular expressions separated by `||`, tested without regard to case (the answer is lower-cased, its spaces tidied and any full stop at the end removed). When one matches, **Check** says the answer is right; when none does, it shows `data-hint`.
- For a chance, use **`data-prob="1/150"`** instead. The answer is right if the first or the last chance in it is within 3% of that value, however it is written: `1/150`, `1 in 150`, `2/300`, `0.0067`, `0.67%`, or a worked answer such as `2/3 × 1/25 × 1/4 = 1/150`. Words work too (`one in four`, `a quarter`, `half`, `two thirds`).
- Without `data-accept` the question takes free text. It counts as done once the student writes something.
- `.q-model` is the model answer, revealed with **Show answer** (see `showModelAnswers` below). It can be left out.

**Multiple choice:**

```html
<div class="q" data-q="i-fa-mcq" data-type="mcq">
  <div class="q-text">Family A: which pattern fits best?</div>
  <div class="mcq">
    <label data-correct data-why="Shown after answering: why this is right"><input type="radio"> Autosomal dominant</label>
    <label data-why="Why this is wrong"><input type="radio"> Autosomal recessive</label>
  </div>
</div>
```

**Click the people on the pedigree:**

```html
<div class="q" data-q="i-cf-obligate" data-type="pick" data-ped="cf" data-answer="philip,ruth" data-prompt="Click everyone who must be a carrier of CF">
  <div class="q-text">Click everyone in this pedigree who <b>must</b> be a carrier.</div>
  <div class="q-model"><p><b>Philip and Ruth</b>, Amelia's parents…</p></div>
</div>
```

`data-answer` lists people by their ids in the family file (`data/pedigrees/cf.json`). The prompt is shown above the drawing while the student chooses. The answer is marked right only if the student picks exactly these people.

**Check a drawing against a family:**

```html
<div class="q" data-q="h-check-mensah" data-type="pedcheck" data-ped="draw-mensah" data-expect="mensah">
  <div class="q-text">Check your pedigree of the Mensah family.</div>
</div>
```

`data-ped` is the student's drawing and `data-expect` the family file it should match. With model answers switched on, the question also offers *Open the model pedigree*.

### Interviews

```html
<div class="interview" data-iv="mensah"></div>
```

This puts the interview in `data/interviews/mensah.json` into the page (see [below](#interviews-datainterviews)).

### “▶ show me” and other action buttons

Any button in the tutorial can carry one or more of these attributes:

| Attribute | What it does | Examples |
|-----------|--------------|----------|
| `data-ped` | Opens a pedigree in the Studio | `okafor` · `draw-price` |
| `data-studio` | Drives the Studio. Separate several commands with `;` | `add:male` · `qa:partner` · `qa:daughter; qa:son` · `qa:parents@proband` · `tool:child` · `tool:twin` · `select:proband` · `select:kofi` · `flash:#probandToggle` · `key` · `fit` · `show:philip,ruth` · `open:cf` |
| `data-inherit` | Sets up the Inheritance tab | `ar 1 1` · `ar 1 1 unaffected` · `ad 0 1` · `xl 1 0` · `calc ar 2/3 1/25` · `calc ad 1/2` |
| `data-bench` | Switches the workbench tab | `pedigree` · `inherit` |
| `data-goto` | Jumps to a chapter or a heading | `ethics` · `eth-hd` |

`data-studio` commands: `add:<shape>` adds a person; `qa:<relative>` adds a relative of the selected person (or of the proband with `@proband`) as the *Add a relative* buttons do; `tool:<partner|child|twin|move|draw>` picks a tool; `select:<id|proband>`; `flash:<CSS selector>` points at a control in the Studio's panel; `key` shows or hides the key; `show:<ids>` outlines people in green.

`data-inherit`: the pattern (`ar`, `ad` or `xl`), then the mother, then the father. For `ar`, 0 is not a carrier, 1 a carrier and 2 affected; for `ad`, 0 is unaffected and 1 affected; for `xl`, the mother is 0, 1 or 2 (not a carrier, carrier, affected) and the father 0 or 1 (unaffected, affected). Add `unaffected` to rule out the affected children. `calc ar <p1> <p2>` and `calc ad <p>` fill in the calculator.

Use `class="do showme"` for the round “show me” pills and `class="goto"` for inline links.

### Other building blocks

- **Callouts:** `<div class="callout info">`, `points` (key points to remember), `scenario` (a clinical scenario), `ethics` or `warn`, with `<div class="co-t">Title</div>` inside.
- **The symbol table:** `<table class="symtab" data-symbols="all"></table>` (or `basic` or `lines`). The rows are in `assets/js/symbols.js`.
- **Optional extensions:** wrap them in `<div class="optional">…</div>`. They are labelled *Extension* and are not counted in the progress bar.
- **Keyboard keys:** `<span class="kbd">Ctrl</span>`.

---

## Families: `data/pedigrees/`

Each family in the tutorial is a small JSON file, with one person per line so that it is easy to edit. The page turns it into a drawing when the pedigree is first opened, and the checker uses it to mark students' drawings.

```json
{
  "id": "cf",
  "title": "Cystic fibrosis: David and Lisa",
  "about": "A note for whoever edits the file; not shown to students.",
  "colours": {"cf": "#2a9d8f"},
  "key": {"cf": "Cystic fibrosis"},
  "keyAt": [13, 0],
  "people": [
    {"id": "philip", "sex": "M", "gen": 1, "x": 8.5, "text": "Philip", "label": "Philip (David's father)"},
    {"id": "ruth", "sex": "F", "gen": 1, "x": 10.5, "text": "Ruth", "label": "Ruth (David's mother)"},
    {"id": "david", "sex": "M", "gen": 2, "x": 6.5, "proband": true, "text": "David", "name": "David", "label": "David"},
    {"id": "amelia", "sex": "F", "gen": 2, "x": 9, "affected": "cf", "text": "Amelia\ncystic fibrosis", "label": "Amelia"}
  ],
  "couples": [["philip", "ruth"], {"a": "lisa", "b": "david", "type": "consanguineous"}],
  "children": [{"of": ["philip", "ruth"], "kids": ["david", "amelia"]}],
  "twins": [{"a": "ryan", "b": "luke", "type": "identical"}],
  "check": {"ignore": ["jean.affected"]}
}
```

**People.** `id` (used in `data-answer` and `select:`), `sex` (`M`, `F` or `U`), `gen` (the row, 0 at the top) and `x` (the position across, in symbol widths). Then any of:

| Field | Draws |
|-------|-------|
| `affected` | shading: `true` for black, a name from `colours`, or a list of two or four names for halves or quarters |
| `deceased` | the diagonal line |
| `proband` | the arrow |
| `carrier` · `pregnancy` · `donor` | a dot · P · D inside the symbol |
| `multiple` | a number (or `"n"`) inside: several people in one symbol |
| `loss` | a pregnancy loss (triangle) |
| `adopted` | brackets (add the child to `adoptedIn`, below, for a dashed line) |
| `line` | `"none"` or `"infertile"`: the bar symbols for no children or infertility |
| `text` | the notes under the symbol (`\n` starts a new line) |
| `label` | how the person is named in feedback and in the answers of pick questions |
| `name` | a first name the checker can look for in a student's notes, which helps it recognise people |

**Couples** are pairs, or `{"a", "b", "type"}` with `type` `consanguineous`, `separated` or `consanguineous-separated`. **Children** hang from a couple, oldest first; `"adoptedIn": ["amy"]` makes Amy's line dashed. **Twins** are `identical` or `nonidentical`. `keyAt` places the key, in the same units as `x` and `gen`.

**The checker** (`assets/js/pedigree.js`) starts from the proband, so a family used with *Check my pedigree* needs one. It matches the rest of the student's drawing by following parents, partners and children, then checks each person and relationship. `check.ignore` switches off a check where the interview leaves it uncertain: `"jean.affected"` accepts Jean shaded or not; `"*.multiple"` accepts any way of drawing groups of people.

To add a family, put its file in `data/pedigrees/` and add it to the `pedigrees` list in `config.js`.

---

## Interviews: `data/interviews/`

```json
{
  "id": "mensah",
  "patient": "Abena Mensah",
  "initials": "AM",
  "subtitle": "34 · referred by her GP after her brother died suddenly",
  "opening": "Hello. My GP said you would want to ask me about my family.",
  "topics": [{"id": "reason", "title": "Why she is here"}, {"id": "sibs", "title": "Brothers and sisters"}],
  "questions": [
    {"id": "why", "topic": "reason", "q": "What has brought you to the clinic today?", "a": "My little brother Kofi died last year…", "key": true},
    {"id": "pass", "topic": "sibs", "q": "When did Kofi pass?", "a": "Pass…? Oh – you mean when did he die.", "after": "sibs", "poor": "Euphemisms such as ‘pass’ can be unclear…"},
    {"id": "sorry", "topic": "sibs", "q": "I'm sorry about Kofi.", "a": "Thank you. It still doesn't feel real.", "after": "kofi", "note": "Acknowledging a loss before you move on…"}
  ]
}
```

- `key: true` marks an important question. The counter under the conversation, and the `iv:done` event, count these.
- `after` holds the question back until another (or each of a list) has been asked, so that follow-up questions appear at the right time.
- `poor` marks a poorly worded question. Its text is shown after the answer as *A better way to ask*. Poor questions are never important ones.
- `note` is a tip shown after the answer.

The model drawings of the two interview families are `mensah.json` and `price.json` in `data/pedigrees/`. If you change who is in an interview, change the model drawing to match, or *Check my pedigree* will disagree with the interview.

---

## Settings: `config.js`

`assets/js/config.js` holds everything you are likely to change apart from the text.

| Setting | Meaning |
|---------|---------|
| `courseTitle`, `courseSubtitle` | Shown in the header. |
| `showModelAnswers` | `true`: students can reveal model answers after trying a question. `false`: the *Show answer* and *Open the model pedigree* buttons are hidden, and `?answers` in the address brings them back for you. |
| `storePrefix` | The name under which everything is saved in the student's browser. Change it to give a new class a clean start. |
| `pedigrees` | The list above the Studio. Each entry has an `id`, a `title` and a `group` (the heading in the list). `file` is the family it starts from (leave it out for a blank page). `mine: true` marks a pedigree the student draws, which goes into *My answers*. `hidden: true` keeps it out of the list until the tutorial opens it (used for the model answers). |

---

## Pedigree Studio in this practical

The drawing tool is a copy of [Pedigree Studio](https://github.com/comparativechrono/PedigreeStudio) by Timothy J Hearn, under its MIT licence (`studio/LICENSE`): v5.1.5 with the new *Tidy* layout (commit `91ce082`, merged into Pedigree Studio as pull request #1). The Pedigree Studio repository itself is not changed.

- **`studio/engine.js`** is Pedigree Studio's drawing engine: the script from its `index.html`, copied with a few small changes, listed at the top of the file. The key it saves under in the browser is now a variable; the SVG export is split so that the practical can put pictures of pedigrees into *My answers*; the start-up code has moved to `practical.js`; and long entries in the colour key widen it or wrap onto more lines, a setting under *File*, as Pedigree Studio's pull request #5 makes them. Later Pedigree Studio changes are copied in too: from pull request #7, a drawing is checked as it is opened, so that a file cannot run code or fetch anything; from pull request #8, the proband's arrow has its P, a consultand has the arrow alone, twins can be of unknown zygosity (a ? between their lines), G marks a gestational carrier (the 2025 correction to the nomenclature), *Clear the whole canvas* empties Undo too, and browsers from before 2021, which lay out flex boxes without gap, get margins instead (`studio.css`); from pull request #9, a symbol can be divided into thirds, triplets and more are drawn from one point, and pedigree numbers go below the symbol, under the notes; and from pull request #10, only people are numbered, not the bars for no children and infertility. To update to a later Pedigree Studio, copy the new script in and make the first three changes (a Pedigree Studio that includes pull request #5 has the fourth already). From pull request #2 onwards, Pedigree Studio's script also carries its own toolbar and panel, in a section headed `INTERFACE`, with a few calls into it from the engine (for example from `showProps` and `deselectAll`); the practical has its own interface in `practical.js`, so leave that section out and take those calls out too.
- **`studio/index.html` and `studio/studio.css`** are a new layout for the classroom. The toolbar groups the controls into *Add*, *Connect*, *Select* and *Draw*, *Undo*, and *Key*, *Tidy*, *File* and help; the settings that were in the side panel are under *File*. The properties panel floats over the drawing (a bottom sheet on phones) and opens when something is selected.
- **`studio/practical.js`** adds what the practical needs: *Add a relative* (partner, son, daughter, parents, brother, sister) and moving brothers and sisters into birth order, each of which lays the pedigree out again with *Tidy* in the same undoable step; choosing people for pick questions; outlining people (orange for problems, green for answers); a read-only mode; and a small programming interface, `window.PedigreeStudio`, used by the page through the frame (`load`, `get`, `svg`, `on('change')`, `quickAdd`, `pickStart`, `highlight` and others; see the end of the file).

Students can also open `studio/index.html` on its own to draw any pedigree. On its own it remembers the last drawing in the browser, as Pedigree Studio does.

---

## Files

```
index.html                 the tutorial (all the text you would edit)
README.md                  this file
.nojekyll                  tells GitHub Pages to serve files as they are
serve.py                   a local web server for trying the site
assets/css/app.css         the page's styling
assets/js/config.js        course settings (see above)
assets/js/core.js          small helpers (DOM, events, storage, downloads, menus)
assets/js/app.js           chapters, steps, questions, progress, My answers
assets/js/bench.js         the Pedigree tab: the Studio frame, the list, saving, checks, picking, ▶ commands
assets/js/pedigree.js      family files -> Studio drawings, and the checker
assets/js/interview.js     the simulated interviews
assets/js/inherit.js       the Inheritance tab and calculator
assets/js/symbols.js       the table of pedigree symbols
data/pedigrees/*.json      the families (see above)
data/interviews/*.json     the two interviews
studio/index.html          Pedigree Studio, practical edition: layout
studio/studio.css          … styling
studio/engine.js           … the drawing engine (Pedigree Studio's, see above)
studio/practical.js        … additions for the practical
studio/LICENSE             Pedigree Studio's MIT licence
```

There are no build tools, frameworks, trackers or scripts from other sites. Everything the page runs is in this folder.

---

## Privacy and data

- There are no accounts, cookies, analytics or tracking, and the page contacts no other website.
- Students' ticks, answers, interviews, name and drawings are stored **only in their own browser** (`localStorage`, keys starting `pedprac1:`). Nothing is sent to you or anyone else. Students download their answers as a file if they need to hand them in. **Start again** in *My answers* clears everything; **Start again** above the Studio clears one pedigree.
- All the families and patients are fictional. Some are based on the scenarios in the lecture and workshop.
- Students should not draw real families, including their own, in a shared or public computer's browser.

---

## Browser support

- **Browsers:** current Chrome, Edge, Firefox and Safari on Windows, macOS, Linux and ChromeOS.
- **Tablets and phones:** they work, with the workbench opening as a full-screen panel and the Studio's panel as a sheet at the bottom, but drawing a pedigree is much easier on a laptop or desktop with a mouse.
- **Mouse and keyboard:** drag a person to move them (and their family), drag the background to move around, scroll or pinch to zoom, <kbd>Shift</kbd>+click to select several people, <kbd>Ctrl</kbd>+<kbd>Z</kbd> and <kbd>Ctrl</kbd>+<kbd>Y</kbd> to undo and redo, <kbd>Delete</kbd> to delete. The **?** at the right of the Studio's toolbar lists the controls.

---

## Notes for teaching staff

- **Model answers** are part of the page, so students can read them in the page source. Switch *Show answer* off in `config.js` if that matters for how you use the practical.
- **Where the practical differs from the workshop and lecture slides:**
  - *CVS.* The lecture gives a 1–2% chance of miscarriage after CVS. Current NHS information gives less than 1 in 200 for most pregnancies, and the practical says so (noting the older figure).
  - *Partners.* The workshop teaches men on the left and women on the right. The practical says that this is the traditional convention and that the 2022 NSGC update (Resta *et al.* 2022, “Both sides now”) leaves the order to whoever draws the pedigree.
  - *Presymptomatic carriers.* Sally, Martha and Sienna carry the variant for a dominant condition but have no symptoms. Like the lecture, the pedigrees mark them with a dot (Pedigree Studio cannot draw anything else); the symbols table explains that the formal NSGC symbol is a vertical line.
  - *Scenario 1.* The short no-children line under Alice on the slide is not drawn: Pedigree Studio hangs that symbol from a couple, and Alice has no partner in the pedigree.
  - *Scenario 3.* The slide has proband arrows at both Sally and Emma; the practical's pedigree has one, at Sally, and Emma's question is in the text. Sean is drawn as a boy (the slides show a circle). The short mark across Helen's line of descent on the slides is not explained there, so it is not reproduced.
  - *Scenario 5.* The pedigree is drawn as the hearing team would see it, as on the slide, without the family's Alzheimer's disease; the question reminds students what they know from scenario 3.
  - *BRCA2 scenario.* Adam's sisters are 35 and 33 (on the slide, 35 and 30), so that the brothers and sisters can be drawn oldest to youngest with Adam next to Jane. Jane's brother is not shaded (his grey shading on the slide is not explained).
  - *Brothers and sisters* are drawn oldest to youngest throughout, which in a few places changes the order from the slides.
- **Marking.** Answers that are chances (1/4, 2/3, 1/150 …) are checked by value, so “1 in 4”, “25%”, “0.25”, “a quarter” and a worked answer ending “= 1/4” are all accepted. Other short answers use the patterns in `data-accept`. A short answer is a check for the student, not a grade: read the free-text answers in the download.
- **The interviews** replace the workshop's paired role-play for students working on their own. If the practical runs alongside the workshop, students can do the interviews in pairs, one asking and one drawing, and then swap for the second interview.
- **Timing:** about three hours in all (see the table above). Chapters 3 to 5 can be set separately.

The staff notes, if you write any, should be kept separately. **Do not add the staff notes to this repository** – anything in a public GitHub Pages repository can be read by students.

---

## Credits and licences

- **Drawing tool:** [Pedigree Studio](https://github.com/comparativechrono/PedigreeStudio) by Timothy J Hearn, MIT licence (`studio/LICENSE`). DOI: [10.5281/zenodo.20209376](https://doi.org/10.5281/zenodo.20209376).
- **Tutorial content:** adapted from two sessions of *GM1B Introduction to Human Genetics and Genomics*: the *Genomics Workshop: Taking and Drawing a Family Tree* by Madelaine Corcoran and Jaskiran Gill (Addenbrooke's Clinical Genetics Department), and the lecture *‘Ethics’, legal and governance issues in genetics and genomics* by Dr Tim Hearn. The interviews, the Okafor family and families A to D were written for this practical.
- **Sources cited in the page:** Bennett RL *et al.* (2008) *J Genet Couns* 17: 424–433 and (2022) *J Genet Couns* 31: 1238–1248 (pedigree nomenclature); Pasmant E *et al.* (2009) *J Med Genet* 46: 425–430 and Brems H *et al.* (2007) *Nat Genet* 39: 1120–1126 (*SPRED1*); Wu J & Morris JK (2013) *Eur J Hum Genet* 21: 1016–1019 (Down syndrome prevalence); *ABC v St George's Healthcare NHS Trust* [2020] EWHC 455 (QB); NHS information on chorionic villus sampling; the Cystic Fibrosis Trust; NHS England's Genomics Education Programme, *Taking and drawing a family history*; NICE NG151 (aspirin in Lynch syndrome); Resta RG *et al.* (2022) “Both sides now”, *J Genet Couns* (partner order).
