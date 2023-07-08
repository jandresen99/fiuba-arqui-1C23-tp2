import config from './config.js';

// Import libraries
import axios from 'axios';
import express from 'express';
import { XMLParser } from 'fast-xml-parser';
import { decode } from 'metar-decoder';
import datadog from 'connect-datadog';

// Create app
const app = express();
const parser = new XMLParser();

// Set app to use the datadog middleware
const connectDatadog = datadog(config.datadog);
app.use(connectDatadog);

// Routes
app.get('/', (req, res) => res.send('Hello World!'));
app.get('/test', wrapped(getTestValue));
// Endpoint de ping para healthcheck
app.get('/ping', (req, res) => {
  res.send('pong');
}
);
// Endpoint para obtener información METAR de un aeropuerto
app.get('/metar', async (req, res) => {
  const station = req.query.station;

  try {
    let idReq;

    // Make the first request to the specified link
    await axios.get('http://10.0.4.4:8888')
      .then(response => {
        idReq = response.data; // Store the response data in idReq variable

        // Make the second request to retrieve METAR information
        axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`)
          .then(response => {
            const parsed = parser.parse(response.data);
            
            if (parsed.response.data.METAR) {
              const metar = decode(parsed.response.data.METAR.raw_text);

              const responseObject = {
                id: idReq,
                metar: metar
              };
              res.json(responseObject);
            } else {
              res.status(404).send(`No se encontró información METAR para la estación ${station}`);
            }
          })
          .catch(error => {
            console.error(error);
            res.status(500).send('Error al obtener la información METAR');
          });
      })
      .catch(error => {
        console.error(error);
        res.status(500).send('Error al obtener el id');
      });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al procesar la solicitud');
  }
});

// Endpoint para obtener los títulos de las 5 últimas noticias sobre actividad espacial
app.get('/space_news', async (req, res) => {
  try {
    let idReq;

    // Make the first request to obtain the ID
    await axios.get(config.remoteGuidsUri)
      .then(response => {
        idReq = response.data;

        // Make the second request to fetch space news articles
        axios.get('https://api.spaceflightnewsapi.net/v3/articles?_limit=5')
          .then(response => {
            const news = response.data.map(item => item.title);
            
            const responseObject = {
              id: idReq,
              news: news
            };

            res.json(responseObject);
          })
          .catch(error => {
            console.error("Error al obtener las noticias", error);
            res.status(500).send('Error al obtener las noticias');
          });
      })
      .catch(error => {
        console.error("Error al obtener el id", error);
        res.status(500).send('Error al obtener el id');
      });
  } catch (error) {
    console.error("Error al procesar la solicitud", error);
    res.status(500).send('Error al procesar la solicitud');
  }
});



// Endpoint para obtener un hecho sin utilidad
app.get('/fact', async (req, res) => {
  try {
    let idReq;

    // Make the first request to obtain the ID
    await axios.get(config.remoteGuidsUri)
      .then(response => {
        idReq = response.data;

        // Make the second request to fetch a random fact
        axios.get('https://uselessfacts.jsph.pl/random.json?language=en')
          .then(response => {
            const fact = response.data.text;

            const responseObject = {
              id: idReq,
              fact: fact
            };

            res.json(responseObject);
          })
          .catch(error => {
            console.error("Error al obtener el hecho", error);
            res.status(500).send('Error al obtener el hecho');
          });
      })
      .catch(error => {
        console.error("Error al obtener el id", error);
        res.status(500).send('Error al obtener el id');
      });
  } catch (error) {
    console.error("Error al procesar la solicitud", error);
    res.status(500).send('Error al procesar la solicitud');
  }
});



// Start app
app.listen(3000, () => console.log('Example app listening on port 3000!'));

// --- Request handlers ---

function wrapped(handler) {
  return async (req, res) => {
    try {
      const response = await handler();
      res.status(200).set({"Cache-Control":"no-cache, no-store, must-revalidate"}).send(response);
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