'use strict'

const express = require('express')
const domain = require('domain')
const cors = require('cors')
const { correlateSession, correlationMiddleware } = require('@first-lego-league/ms-correlation')
const { authenticationMiddleware, authenticationDevMiddleware } = require('@first-lego-league/ms-auth')
const { loggerMiddleware, Logger } = require('@first-lego-league/ms-logger')

const logger = Logger()
const crudRouter = require('./routers/crudRouter').getRouter
const { initImagesFolder } = require('./logic/images')

const Team = require('./models/Team')
const Match = require('./models/Match')
const Table = require('./models/Table')

const appPort = process.env.PORT || 3001

const bodyParser = require('body-parser')

logger.setLogLevel(process.env.LOG_LEVEL || logger.LOG_LEVELS.DEBUG)

const app = express()
app.use(bodyParser.json({limit: '50mb'}))
app.use(correlationMiddleware)
app.use(loggerMiddleware)

if (process.env.DEV) {
  app.use(authenticationDevMiddleware())
} else {
  app.use(authenticationMiddleware)
}

app.use(cors())

const { getSettingsRouter, setDefaultSettings } = require('./routers/generalSettingsRouter')
const tournamentDataRouter = require('./routers/tournamentDataRouter')
const matchTeamRouter = require('./routers/matchTeamRouter')
const { imagesRouter } = require('./routers/imagesRouter')

app.use('/settings', getSettingsRouter())
app.use('/image', imagesRouter)
app.use('/tournamentData', tournamentDataRouter)

const teamLogic = require('./logic/teamLogic')

app.use('/team', crudRouter({
  'collectionName': 'teams',
  'IdField': Team.IdField,
  'extraRouters': [matchTeamRouter.getRouter()],
  'validationMethods': {
    'delete': teamLogic.deleteValidation
  }
}))

app.use('/team', matchTeamRouter.getRouter())

app.use('/match', crudRouter({
  'collectionName': 'matches',
  'IdField': Match.IdField
}))

app.use('/table', crudRouter({
  'collectionName': 'tables',
  'IdField': Table.IdField
}))

app.listen(appPort, () => {
  domain.create().run(() => {
    correlateSession()
    setDefaultSettings()
    initImagesFolder()
    logger.info('Server started on port ' + appPort)
  })
})
