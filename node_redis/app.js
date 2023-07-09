import config from './config.js';

// Import libraries
import axios from 'axios';
import express from 'express';
import { XMLParser } from 'fast-xml-parser';
import { decode } from 'metar-decoder';
import datadog from 'connect-datadog';
import { createClient } from 'redis';
import { StatsD } from 'hot-shots';

const statsd = new StatsD({
  host: 'localhost',//aca no se decir bien que host deberia ir
  port: 8125, //aca tampoco, creo hay que setear conn las de datadog
});

// Create app
const app = express();
const parser = new XMLParser();
const cacheHostName = config.redis.host
const cachePassword = ''
const redisClient = createClient({
  socket: {
    host: cacheHostName,
    port: 6379,
  },
  password: cachePassword
});



// Set app to use the datadog middleware
const connectDatadog = datadog(config.datadog);
app.use(connectDatadog);

(async () => {
  await redisClient.connect();
  console.log('Connected to Redis');
})();

process.on('SIGTERM', async () => {
  await redisClient.quit();
});

// Routes
app.get('/', (req, res) => res.send('Hello World!'));
app.get('/test', wrapped(getTestValue));
// Endpoint de ping para healthcheck
app.get('/ping', (req, res) => {
  const startTime = Date.now();
  res.send('pong');
  const elapsed = Date.now() - startTime; // calcula la duración en milisegundos
  statsd.timing('customMetric.ping', elapsed); // Envía la demora a StatsD
}
);
// Endpoint para obtener información METAR de un aeropuerto
app.get('/metar', async (req, res) => {
  const startTime = Date.now();
  const station = req.query.station;

  try {
    let idReq;
    redisClient.get('metar')
    .then(metarString => {

    // Make the first request to the specified link
    axios.get('http://10.0.4.4:8888')
      .then(response => {
        idReq = response.data; // Store the response data in idReq variable
        if (metarString) {
          const responseObject = {
            id: idReq,
            metar: metarString
          };
          res.json(responseObject);
        } else {
          const startTimeRequest = Date.now();
          // Make the second request to retrieve METAR information
          axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`)
            .then(response => {
              const elapsedRequest = Date.now() - startTimeRequest; // calcula la duración en milisegundos
              statsd.timing('customMetric.metar_request_time', elapsedRequest);
              const parsed = parser.parse(response.data);

              if (parsed.response.data.METAR) {
                const metar = decode(parsed.response.data.METAR.raw_text);
                // Await the redisClient.set operation wrapped in a Promise
                  redisClient.set('metar', JSON.stringify(metar), { EX: 5 })
                  .then(() => {
                    const responseObject = {
                      id: idReq,
                      metar: metar
                    };
                    res.json(responseObject);
                  })
                  .catch(error => {
                    console.error(error);
                    res.status(500).send('Error al procesar la solicitud');
                  });
              } else {
                res.status(404).send(`No se encontró información METAR para la estación ${station}`);
              }
            })
            .catch(error => {
              console.error(error);
              res.status(500).send('Error al obtener la información METAR');
            });
        }
      })
      .catch(error => {
        console.error(error);
        res.status(500).send('Error al obtener el id');
      });
    })
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al procesar la solicitud');
  }finally {
    const endTime = Date.now(); // registra el tiempo de finalización
    const elapsed = endTime - startTime; // calcula la duración en milisegundos
    statsd.timing('customMetric.metar', elapsed);
  }
});

// Endpoint para obtener los títulos de las 5 últimas noticias sobre actividad espacial
app.get('/space_news', async (req, res) => {
  const startTime = Date.now();
  try {
    let idReq;
    redisClient.get('news')
    .then(redisResponse => {

   
    // Make the first request to obtain the ID
    axios.get('http://10.0.4.4:8888')
      .then(response => {
        idReq = response.data;
        if (redisResponse) {
          const responseObject = {
            id: idReq,
            news: redisResponse
          };
          res.json(responseObject);
        } else {
          const startTimeRequest = Date.now();
          // Make the second request to fetch space news articles
          axios.get('https://api.spaceflightnewsapi.net/v3/articles?_limit=5')
            .then(response => {
              const elapsedRequest = Date.now() - startTimeRequest; // calcula la duración en milisegundos
              statsd.timing('customMetric.space_news_request_time', elapsedRequest);
              const news = response.data.map(item => item.title);
              // Await the redisClient.set operation wrapped in a Promise
                redisClient.set('news', JSON.stringify(news), { EX: 5 })
                .then(() => {
                  const responseObject = {
                    id: idReq,
                    news: news
                  };
                  res.json(responseObject);
                })
                .catch(error => {
                  console.error(error);
                  res.status(500).send('Error al procesar la solicitud');
                });
              })
            .catch(error => {
              console.error("Error al obtener las noticias", error);
              res.status(500).send('Error al obtener las noticias');
            });
        }
      })
      .catch(error => {
        console.error("Error al obtener el id", error);
        res.status(500).send('Error al obtener el id');
      });
    })
  } catch (error) {
    console.error("Error al procesar la solicitud", error);
    res.status(500).send('Error al procesar la solicitud');
  } finally {
    const endTime = Date.now(); // registra el tiempo de finalización
    const elapsed = endTime - startTime; // calcula la duración en milisegundos
    statsd.timing('customMetric.space_news', elapsed); // Envía la demora a StatsD
  }
});



// Endpoint para obtener un hecho sin utilidad
app.get('/fact', async (req, res) => {
  const startTime = Date.now();
  try {
    let idReq;
    redisClient.get('fact')
    .then(redisResponse => {
    // Make the first request to obtain the ID
     axios.get('http://10.0.4.4:8888')
      .then(response => {
        idReq = response.data;
        if (redisResponse) {
          const responseObject = {
            id: idReq,
            fact: `${redisResponse}`
          };
          res.json(responseObject);
        } else {
          const startTimeRequest = Date.now();
          // Make the second request to fetch a random fact
          axios.get('https://uselessfacts.jsph.pl/random.json?language=en')
            .then(response => {
              const elapsedRequest = Date.now() - startTimeRequest; // calcula la duración en milisegundos
              statsd.timing('customMetric.fact_request_time', elapsedRequest);
              const fact = response.data.text;
                redisClient.set('fact', JSON.stringify(fact), { EX: 5 })
                .then(() => {
                  const responseObject = {
                    id: idReq,
                    fact: fact
                  };
                  res.json(responseObject);
                })
                .catch(error => {
                  console.error(error);
                  res.status(500).send('Error al procesar la solicitud');
                });
            })
            .catch(error => {
              console.error("Error al obtener el hecho", error);
              res.status(500).send('Error al obtener el hecho');
            });
        }
      })
      .catch(error => {
        console.error("Error al obtener el id", error);
        res.status(500).send('Error al obtener el id');
      });
    })
  } catch (error) {
    let errorStr = `Error al procesar la solicitud ${error}`
    console.error(errorStr);
    res.status(500).send(errorStr);
  } finally {
    const endTime = Date.now(); // registra el tiempo de finalización
    const elapsed = endTime - startTime; // calcula la duración en milisegundos
    statsd.timing('customMetric.fact', elapsed); // Envía la demora a StatsD
  }
});



// Start app
app.listen(3000, () => console.log('Example app listening on port 3000!'));

// --- Request handlers ---

function wrapped(handler) {
  return async (req, res) => {
    try {
      const response = await handler();
      res.status(200).set({ "Cache-Control": "no-cache, no-store, must-revalidate" }).send(response);
    } catch (error) {
      res.status(500).send(error);
    }
  }
}

async function getTestValue() {
  return "This is a test";
}

// --- helper functions ---

function debug(...args) {
  if (!config.debug) {
    return;
  }

  console.log(...args);
}