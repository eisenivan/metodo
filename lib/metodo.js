#!/usr/bin/env node

const FileSync = require('lowdb/adapters/FileSync')
const Table = require('terminal-table')
const low = require('lowdb')
const os = require('os')
const program = require('commander')
const { prompt } = require('inquirer')
const {
  addPom,
  deletePom,
  finishDay,
  finishPom,
  getActivePoms,
  getArchivedPoms,
  getFinishedPoms,
  getTodoPoms,
  inspectPom,
  listPoms,
  actualTime,
  relativeElapsedTime,
  startPom
} = require('./helpers')

const MSG_NO_POMS = 'No poms to show'

const adapter = new FileSync(`/Users/${os.userInfo().username}/.metodo.json`)
const db = low(adapter)

// Set some defaults (required if your JSON file is empty)
db.defaults({ poms: {}, days: [] })
  .write()

program
  .command('add')
  .alias('a')
  .description('add a pom')
  .action(() => {
    prompt([
      { type: 'input', name: 'title', message: 'Title' },
      { type: 'input', name: 'estimate', message: 'Estimate (hours)' }
    ])
      .then((answers) => {
        addPom(answers, db)
      })
  })

program
  .command('start')
  .alias('s')
  .description('start a pom')
  .action(() => {
    const poms = db.get('poms').value()
    prompt([
      { type: 'list', name: 'id', message: 'Choose', choices: getTodoPoms(poms) },
      { name: 'notes', message: 'Notes?', default: '' }
    ]).then((answers) => {
      startPom(answers, db)
    })
  })

program
  .command('list')
  .alias('l')
  .description('list all active poms')
  .action(() => {
    const todoPoms = db
      .get('poms')
      .filter(x => x.status === 'todo')
      .value()

    const activePoms = db
      .get('poms')
      .filter(x => x.status === 'active')
      .value()

    const finishedPoms = db
      .get('poms')
      .filter(x => x.status === 'finished')
      .value()

    const list = new Table({
      borderStyle: 1,
      leftPadding: 2,
      rightPadding: 2
    })

    list.push(['Title', 'Original Estimate', 'Actual Time', 'Status'])
    list.attrRange({ row: [0, 1] }, {
      color: 'blue'
    })

    const foundPoms = [...todoPoms, ...activePoms, ...finishedPoms]

    if (program.all) {
      foundPoms.push(...getArchivedPoms(db))
    }

    listPoms(foundPoms).map((x, i) => {
      let time
      if (x.status === 'active') {
        // calculate elapsed time
        time = `${relativeElapsedTime(x.started)} ⏱`

        list.attrRange({ row: [i + 1, i + 2] }, {
          color: 'green'
        })
      } else {
        time = x.actual ? actualTime(x.actual) : '--'
      }

      list.push([x.title, actualTime(x.estimate), time, x.status])

      if (x.status === 'finished') {
        list.attrRange({ row: [i + 1, i + 2] }, {
          color: 'grey'
        })
      }
    })

    console.log(`${list}`)
  })

program
  .command('finish')
  .alias('/')
  .description('stop a pom')
  .action(() => {
    const poms = db.get('poms').value()
    prompt([
      { type: 'list', name: 'id', message: 'Choose', choices: getActivePoms(poms) },
      { name: 'actual', message: 'Actual (hours)' },
      { name: 'notes', message: 'Notes?', default: '' }
    ]).then((answers) => {
      finishPom(answers, db)
    })
  })

program
  .command('delete')
  .alias('D')
  .description('delete a pom')
  .action(() => {
    const poms = db.get('poms').value()
    const choices = [...getTodoPoms(poms), ...getActivePoms(poms), ...getFinishedPoms(poms)]

    if (choices.length > 0) {
      prompt([
        { type: 'list', name: 'id', message: 'Choose', choices },
        { type: 'confirm', name: 'sure', message: 'Are you sure?' }
      ]).then((answers) => {
        deletePom(answers, db)
      })
    } else {
      console.log(MSG_NO_POMS)
    }
  })

program
  .command('info')
  .alias('i')
  .description('get info about a pom')
  .action(() => {
    const poms = db.get('poms').value()
    const choices = [...getTodoPoms(poms), ...getActivePoms(poms), ...getFinishedPoms(poms)]

    if (program.all) {
      choices.push(...getArchivedPoms(db).map(x => ({
        name: `[ ${x.title} ]`,
        value: x.id || 'legacy'
      })))
    }

    if (choices.length > 0) {
      prompt([
        { type: 'list', name: 'id', message: 'Choose', choices }
      ]).then((answers) => {
        inspectPom(answers, db)
      })
    } else {
      console.log(MSG_NO_POMS)
    }
  })

program
  .command('archive')
  .alias('/day')
  .description('finish a day')
  .action(() => {
    finishDay(db)
  })

program
  .version('1.1.0')
  .description('Metodo: a command line pomodoro application')
  .option('-a, --all', 'inclue archived poms')
  .parse(process.argv)
