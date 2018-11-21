const moment = require('moment')
const _get = require('lodash.get')
const _flow = require('lodash.flow')
const uuidv1 = require('uuid/v1')
const Table = require('terminal-table')
require('colors')

const DATE_TIME_FORMAT = 'MMMM Do YYYY, h:mm a'
const FULL_DATE_TIME_FORMAT = 'dddd, MMMM Do YYYY, h:mm a'

const formatNotes = notes => ({
  notes,
  timestamp: moment().format()
})

const getElapsedTime = start => moment().diff(moment(start), 'minutes') / 60
const getTotalTime = (start, end) => (moment(end).diff(moment(start), 'minutes') / 60).toFixed(2)

const getDiff = (estimate, actual = 0) => {
  const x = parseFloat(estimate)
  const y = parseFloat(actual)

  return x - y
}

const getRelativeTime = time => (time < 1)
  ? Math.ceil(time * 60) + ' minutes'.grey : time + ' hours'.grey

const relativeElapsedTime = _flow(
  getElapsedTime,
  getRelativeTime
)

const actualTime = _flow(
  getDiff,
  getRelativeTime
)

module.exports.relativeElapsedTime = relativeElapsedTime
module.exports.actualTime = actualTime

module.exports.listPoms = poms => Object.keys(poms).map(x => ({
  title: poms[x].title,
  estimate: `${poms[x].estimate} hours`,
  status: poms[x].status,
  notes: _get(poms, '[x].notes', []).join('\n'),
  started: poms[x].started,
  actual: poms[x].actual ? `${poms[x].actual} hours` : ''
}))

module.exports.getTodoPoms = poms => Object.keys(poms).reduce((acc, x) => {
  if (poms[x].status === 'todo') {
    acc.push({ name: poms[x].title, value: x })
  }

  return acc
}, [])

module.exports.getActivePoms = poms => Object.keys(poms).reduce((acc, x) => {
  if (poms[x].status === 'active') {
    acc.push({ name: poms[x].title, value: x })
  }

  return acc
}, [])

module.exports.getFinishedPoms = poms => Object.keys(poms).reduce((acc, x) => {
  if (poms[x].status === 'finished') {
    acc.push({ name: poms[x].title, value: x })
  }

  return acc
}, [])

module.exports.addPom = ({ title, estimate }, db) => {
  db
    .set(`poms[${uuidv1()}]`, {
      created: moment().format(),
      title,
      status: 'todo',
      estimate,
      notes: []
    })
    .write()
}

module.exports.startPom = ({ id, notes }, db) => {
  db
    .set(`poms[${id}].status`, 'active')
    .set(`poms[${id}].started`, moment().format())
    .write()

  if (notes) {
    db
      .get(`poms[${id}].notes`)
      .push(formatNotes(notes))
      .write()
  }
}

module.exports.deletePom = ({ id, sure }, db) => {
  if (sure) {
    db
      .unset(`poms[${id}]`)
      .write()
  }
}

module.exports.finishPom = ({ id, actual, notes }, db) => {
  let calculated

  db
    .set(`poms[${id}].status`, 'finished')
    .set(`poms[${id}].finished`, moment().format())
    .write()

  if (actual) {
    db.set(`poms[${id}].actual`, actual)
      .write()
  } else {
    const start = db.get(`poms[${id}].started`).value()
    const end = db.get(`poms[${id}].finished`).value()
    calculated = getTotalTime(start, end)
    db.set(`poms[${id}].actual`, calculated)
      .write()
  }

  if (notes) {
    db
      .get(`poms[${id}].notes`)
      .push(formatNotes(notes))
      .write()
  }

  console.log('★★★★★★★★★★★★★★★★★★★★★★★')
  console.log(`${db.get(`poms[${id}].title`).value()}`.green)
  console.log(`${actualTime(actual || calculated)}`)
  console.log('★★★★★★★★★★★★★★★★★★★★★★★')
}

module.exports.inspectPom = ({ id }, db) => {
  const pom = db.get(`poms[${id}]`).value()
  const list = new Table({
    borderStyle: 1,
    leftPadding: 2,
    rightPadding: 2
  })

  list.attrRange({
    column: [0, 1]
  }, {
    align: 'right',
    color: 'blue'
  })

  list.push(['Created', moment(pom.created).format(FULL_DATE_TIME_FORMAT)])
  list.push(['Title', pom.title])
  list.push(['Status', pom.status])
  list.push(['Original Estimate', actualTime(pom.estimate)])

  if (pom.status === 'active') {
    list.push(['Elapsed Time', relativeElapsedTime(pom.started)])
  }

  if (pom.status === 'finished') {
    list.push(['Actual Time', actualTime(pom.actual)])
    list.push(['Difference', actualTime(pom.estimate, pom.actual)])
  }

  if (pom.started) {
    list.push(['Started', moment(pom.started).format(FULL_DATE_TIME_FORMAT)])
  }

  if (pom.finished) {
    list.push(['Finished', moment(pom.finished).format(FULL_DATE_TIME_FORMAT)])
  }

  console.log(`${list}`)
  console.log('')
  console.log('NOTES:'.bgWhite.black)
  console.log('')
  pom.notes.forEach((x) => {
    if (x.timestamp) {
      console.log(`${moment(x.timestamp).format(DATE_TIME_FORMAT).grey}\n${x.notes.green}`)
      console.log('')
    }
  })
}

module.exports.finishDay = (db) => {
  const finished = db
    .get('poms')
    .filter((value) => value.status === 'finished')
    .value()

  const diff = finished.reduce((acc, x) => {
    acc += parseFloat((-1 * x.estimate), 10) + parseFloat(x.actual, 10)
    return acc
  }, 0)

  if (Object.keys(finished).length > 0) {
    db
      .get('days')
      .push({
        date: moment().format('YYYY-MM-DD'),
        accuracy: diff,
        poms: finished
      })
      .write()

    const poms = db.get('poms')
    const remove = poms.value()
    const ids = Object.keys(remove).filter(x => remove[x].status === 'finished')
    ids.forEach((id) => {
      poms.unset(id).write()
    })

    console.log('========================================')
    console.log(`Today's Margin of Error: ${actualTime(diff)}`)
    console.log('========================================')
  } else {
    console.log('=================')
    console.log('No Finished Poms')
    console.log('=================')
  }
}
