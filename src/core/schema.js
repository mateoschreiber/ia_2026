/* Definición del esquema de la base de datos (entidades y campos). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  function entity(idPrefix, fields) {
    return { idPrefix: idPrefix, fields: fields };
  }

  var SCHEMA = {
    version: 1,
    entities: {
      zones: entity('z', {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true, minLength: 1 },
        description: { type: 'string', required: false }
      }),
      transformers: entity('t', {
        id: { type: 'string', required: true },
        zoneId: { type: 'string', required: true, ref: 'zones' },
        name: { type: 'string', required: true },
        capacityKva: { type: 'number', required: true, min: 0 },
        energySuppliedKwh: { type: 'number', required: false, min: 0 }
      }),
      meters: entity('m', {
        id: { type: 'string', required: true },
        transformerId: { type: 'string', required: true, ref: 'transformers' },
        customerType: { type: 'string', required: true, enum: ['residencial', 'comercial', 'industrial'] },
        tariff: { type: 'string', required: false },
        capacityContractedKw: { type: 'number', required: false, min: 0 },
        active: { type: 'boolean', required: true }
      }),
      labels: entity('l', {
        id: { type: 'string', required: true },
        meterId: { type: 'string', required: true, ref: 'meters' },
        isFraud: { type: 'boolean', required: true },
        archetype: { type: 'string', required: false },
        note: { type: 'string', required: false }
      }),
      detections: entity('d', {
        id: { type: 'string', required: true },
        meterId: { type: 'string', required: true, ref: 'meters' },
        model: { type: 'string', required: true },
        score: { type: 'number', required: true },
        flag: { type: 'boolean', required: true },
        createdAt: { type: 'string', required: false }
      }),
      alerts: entity('a', {
        id: { type: 'string', required: true },
        type: { type: 'string', required: true },
        severity: { type: 'string', required: true, enum: ['baja', 'media', 'alta', 'critica'] },
        meterId: { type: 'string', required: false, ref: 'meters' },
        transformerId: { type: 'string', required: false, ref: 'transformers' },
        message: { type: 'string', required: true }
      })
    },
    topLevel: {
      schemaVersion: { type: 'number', required: true },
      zones: { type: 'array', required: true },
      transformers: { type: 'array', required: true },
      meters: { type: 'array', required: true },
      readings: { type: 'array', required: true },
      weather: { type: 'object', required: true },
      labels: { type: 'array', required: true },
      detections: { type: 'array', required: true },
      forecast: { type: 'array', required: true },
      alerts: { type: 'array', required: true }
    }
  };

  App.SCHEMA = SCHEMA;
})(window);
