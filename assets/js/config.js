/* =====================================================================
   COURSE SETTINGS – edit this file to adapt the practical.
   (No build step: edit, commit, and GitHub Pages updates the site.)
   ===================================================================== */
window.PP_CONFIG = {
  /* Shown in the header */
  courseTitle: 'Pedigrees: drawing, inheritance and ethics',
  courseSubtitle: 'Genomics practical · family history, inheritance and ethics',

  /* Model answers.
     true  – students can reveal a model answer after trying a question
     false – the "Show answer" buttons are hidden (add ?answers to the page
             address to see them, e.g. when demonstrating in class) */
  showModelAnswers: true,

  /* Name used for everything saved in the student's browser. Change it
     to give a new class a clean start. */
  storePrefix: 'pedprac1:',

  /* The pedigrees in the workbench's list.
     id     – used in the tutorial (data-ped="…") and for saving
     title  – shown in the list
     file   – a family file in data/pedigrees/ to start from (leave out
              for a blank canvas)
     group  – heading in the list
     mine   – the student draws this one: it goes into "My answers"
     hidden – only appears in the list once the tutorial opens it
              (used for model answers) */
  pedigrees: [
    { id: 'practice', title: 'My practice pedigree', group: 'Your drawings', mine: true },
    { id: 'draw-mensah', title: 'Interview 1: the Mensah family', group: 'Your drawings', mine: true },
    { id: 'draw-price', title: 'Interview 2: the Price family', group: 'Your drawings', mine: true },

    { id: 'okafor', title: 'Reading a pedigree: the Okafor family', group: 'Chapter 2', file: 'data/pedigrees/okafor.json' },

    { id: 'mensah', title: 'Model answer: the Mensah family', group: 'Model answers', file: 'data/pedigrees/mensah.json', hidden: true },
    { id: 'price', title: 'Model answer: the Price family', group: 'Model answers', file: 'data/pedigrees/price.json', hidden: true },

    { id: 'family-a', title: 'Family A', group: 'Chapter 4', file: 'data/pedigrees/family-a.json' },
    { id: 'family-b', title: 'Family B', group: 'Chapter 4', file: 'data/pedigrees/family-b.json' },
    { id: 'family-c', title: 'Family C', group: 'Chapter 4', file: 'data/pedigrees/family-c.json' },
    { id: 'family-d', title: 'Family D', group: 'Chapter 4', file: 'data/pedigrees/family-d.json' },
    { id: 'cf', title: 'Cystic fibrosis: David and Lisa', group: 'Chapter 4', file: 'data/pedigrees/cf.json' },
    { id: 'cf-cousins', title: 'Cystic fibrosis: related grandparents', group: 'Chapter 4', file: 'data/pedigrees/cf-cousins.json' },
    { id: 'brca2', title: 'BRCA2: Jane and Adam', group: 'Chapter 4', file: 'data/pedigrees/brca2.json' },

    { id: 'lynch', title: 'Scenario 1: Lynch syndrome', group: 'Chapter 5', file: 'data/pedigrees/lynch.json' },
    { id: 'hd', title: 'Scenario 2: Huntington’s disease', group: 'Chapter 5', file: 'data/pedigrees/hd.json' },
    { id: 'eofad', title: 'Scenario 3: Alzheimer’s disease and VHL', group: 'Chapter 5', file: 'data/pedigrees/eofad.json' },
    { id: 'hd-pregnancy', title: 'Scenario 4: Huntington’s disease in pregnancy', group: 'Chapter 5', file: 'data/pedigrees/hd-pregnancy.json' },
    { id: 'hearing', title: 'Scenario 5: hearing loss and a genome', group: 'Chapter 5', file: 'data/pedigrees/hearing.json' }
  ]
};
