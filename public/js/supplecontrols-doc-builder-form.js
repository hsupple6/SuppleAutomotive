(function (global) {
  'use strict';

  var CUSTOMER_IDS = [
    { key: 'name', id: 'cust-name' },
    { key: 'email', id: 'cust-email' },
    { key: 'phone', id: 'cust-phone' },
    { key: 'address_line1', id: 'cust-address1' },
    { key: 'address_line2', id: 'cust-address2' },
    { key: 'city', id: 'cust-city' },
    { key: 'state', id: 'cust-state' },
    { key: 'postal_code', id: 'cust-zip' }
  ];

  var VEHICLE_KEYS = [
    'vehicle_year', 'vehicle_make', 'vehicle_model', 'vehicle_trim',
    'vehicle_vin', 'vehicle_license_plate', 'vehicle_mileage'
  ];

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function createFormController(options) {
    options = options || {};
    var estimateFieldsWrap = options.estimateFieldsWrap;
    var onInvalidate = options.onInvalidate || function () {};
    var releaseFieldSpec = [];
    var detailsSectionTitle = options.detailsSectionTitle || 'Estimate details';

    function collectCustomer() {
      var out = {};
      CUSTOMER_IDS.forEach(function (f) {
        var el = document.getElementById(f.id);
        out[f.key] = el ? el.value.trim() : '';
      });
      return out;
    }

    function fillCustomer(c) {
      c = c || {};
      CUSTOMER_IDS.forEach(function (f) {
        var el = document.getElementById(f.id);
        if (el) el.value = c[f.key] != null ? String(c[f.key]) : '';
      });
    }

    function fillVehicle(vehicle) {
      var map = {
        vehicle_year: vehicle && vehicle.year != null ? String(vehicle.year) : '',
        vehicle_make: vehicle && vehicle.make ? String(vehicle.make) : '',
        vehicle_model: vehicle && vehicle.model ? String(vehicle.model) : '',
        vehicle_trim: vehicle && vehicle.trim ? String(vehicle.trim) : '',
        vehicle_vin: vehicle && vehicle.vin ? String(vehicle.vin) : '',
        vehicle_license_plate: vehicle && vehicle.license_plate ? String(vehicle.license_plate) : '',
        vehicle_mileage: vehicle && vehicle.mileage != null ? String(vehicle.mileage) : ''
      };
      VEHICLE_KEYS.forEach(function (k) {
        var el = document.getElementById('field-' + k);
        if (el) el.value = map[k] || '';
      });
    }

    function fillVehicleFromFields(fields) {
      fields = fields || {};
      VEHICLE_KEYS.forEach(function (k) {
        var el = document.getElementById('field-' + k);
        if (el) el.value = fields[k] != null ? String(fields[k]) : '';
      });
    }

    function wireInputInvalidation(root) {
      if (!root) return;
      root.querySelectorAll('input, textarea, select').forEach(function (el) {
        el.addEventListener('input', onInvalidate);
      });
    }

    function partRowInitialValues(initial) {
      initial = initial || {};
      var unitPrice = '';
      if (initial.unit_price != null && String(initial.unit_price).trim() !== '') {
        unitPrice = initial.unit_price;
      } else if (initial.cost != null && String(initial.cost).trim() !== '') {
        unitPrice = initial.cost;
      }
      return {
        name: initial.name || '',
        part_number: initial.part_number || '',
        unit_cost: initial.unit_cost != null && String(initial.unit_cost).trim() !== '' ? initial.unit_cost : '',
        unit_price: unitPrice
      };
    }

    function addPartRow(partsWrap, initial) {
      var vals = partRowInitialValues(initial);
      var partRow = document.createElement('div');
      partRow.className = 'starter-service-part-row';
      partRow.innerHTML =
        '<input type="text" data-role="part-name" aria-label="Part name" placeholder="Part name" value="' + esc(vals.name).replace(/"/g, '&quot;') + '" />' +
        '<input type="text" data-role="part-number" aria-label="Part number" placeholder="Part #" value="' + esc(vals.part_number).replace(/"/g, '&quot;') + '" />' +
        '<input type="text" data-role="part-unit-cost" aria-label="Unit cost" placeholder="Unit cost" value="' + esc(vals.unit_cost).replace(/"/g, '&quot;') + '" />' +
        '<input type="text" data-role="part-unit-price" aria-label="Unit price" placeholder="Unit price" value="' + esc(vals.unit_price).replace(/"/g, '&quot;') + '" />' +
        '<button type="button" class="btn btn-ghost" data-role="remove-part">Remove</button>';
      wireInputInvalidation(partRow);
      partRow.querySelector('[data-role="remove-part"]').addEventListener('click', function () {
        partRow.remove();
        onInvalidate();
      });
      partsWrap.appendChild(partRow);
    }

    function addServiceBlock(collectionKey, initial) {
      initial = initial || {};
      var wrap = estimateFieldsWrap.querySelector('[data-collection-key="' + collectionKey + '"]');
      if (!wrap) return;
      var blocksWrap = wrap.querySelector('.starter-service-blocks');
      var block = document.createElement('div');
      block.className = 'starter-service-block';
      block.innerHTML =
        '<div class="starter-service-head">' +
        '<input type="text" data-role="service-name" aria-label="Service name" placeholder="Service name" value="' + esc(initial.name || '').replace(/"/g, '&quot;') + '" />' +
        '<input type="text" data-role="service-hours" aria-label="Labor hours" placeholder="Hours" value="' + esc(initial.labor_hours || '').replace(/"/g, '&quot;') + '" />' +
        '<button type="button" class="btn btn-ghost" data-role="remove-service">Remove</button>' +
        '</div>' +
        '<div class="starter-service-parts">' +
        '<div class="starter-service-parts-title">Parts for this service</div>' +
        '<div class="starter-service-parts-rows"></div>' +
        '<button type="button" class="btn btn-ghost" data-role="add-part">+ Add part</button>' +
        '</div>';
      var partsRowsWrap = block.querySelector('.starter-service-parts-rows');
      block.querySelector('[data-role="add-part"]').addEventListener('click', function () {
        addPartRow(partsRowsWrap, {});
      });
      block.querySelector('[data-role="remove-service"]').addEventListener('click', function () {
        block.remove();
        onInvalidate();
      });
      wireInputInvalidation(block);
      (Array.isArray(initial.parts) ? initial.parts : []).forEach(function (p) {
        addPartRow(partsRowsWrap, p);
      });
      if (!initial.parts || !initial.parts.length) addPartRow(partsRowsWrap, {});
      blocksWrap.appendChild(block);
    }

    function mountServiceCollection(key, initialServices) {
      var wrap = estimateFieldsWrap.querySelector('[data-collection-key="' + key + '"]');
      if (!wrap) return;
      var blocksWrap = wrap.querySelector('.starter-service-blocks');
      blocksWrap.innerHTML = '';
      var list = Array.isArray(initialServices) ? initialServices : [];
      if (list.length) {
        list.forEach(function (svc) { addServiceBlock(key, svc); });
      } else {
        addServiceBlock(key, {});
      }
    }

    function collectFields() {
      var fields = {};
      releaseFieldSpec.forEach(function (f) {
        if (f.isSection) return;
        if (f.isCollection && f.collectionType === 'service_group') {
          var rows = [];
          var blocks = estimateFieldsWrap
            ? estimateFieldsWrap.querySelectorAll('[data-collection-key="' + f.key + '"] .starter-service-block')
            : [];
          blocks.forEach(function (block) {
            var nameEl = block.querySelector('[data-role="service-name"]');
            var hoursEl = block.querySelector('[data-role="service-hours"]');
            var nameVal = nameEl ? nameEl.value.trim() : '';
            var hoursVal = hoursEl ? hoursEl.value.trim() : '';
            var parts = [];
            block.querySelectorAll('.starter-service-part-row').forEach(function (partRow) {
              var pn = partRow.querySelector('[data-role="part-name"]');
              var pnum = partRow.querySelector('[data-role="part-number"]');
              var puc = partRow.querySelector('[data-role="part-unit-cost"]');
              var pup = partRow.querySelector('[data-role="part-unit-price"]');
              var partNameVal = pn ? pn.value.trim() : '';
              var partNumberVal = pnum ? pnum.value.trim() : '';
              var unitCostVal = puc ? puc.value.trim() : '';
              var unitPriceVal = pup ? pup.value.trim() : '';
              if (partNameVal || partNumberVal || unitCostVal || unitPriceVal) {
                parts.push({
                  name: partNameVal,
                  part_number: partNumberVal,
                  unit_cost: unitCostVal,
                  unit_price: unitPriceVal
                });
              }
            });
            if (nameVal || hoursVal || parts.length) {
              rows.push({ name: nameVal, labor_hours: hoursVal, parts: parts });
            }
          });
          fields[f.key] = rows;
          return;
        }
        if (f.isCollection) return;
        var el = document.getElementById('field-' + f.key);
        fields[f.key] = el ? el.value : '';
      });
      VEHICLE_KEYS.forEach(function (k) {
        var el = document.getElementById('field-' + k);
        fields[k] = el ? el.value.trim() : '';
      });
      return fields;
    }

    function renderFields(initialFields) {
      if (!estimateFieldsWrap) return;
      initialFields = initialFields || {};
      var html = '<div class="section-title">' + esc(detailsSectionTitle) + '</div>';
      var mounts = [];

      releaseFieldSpec.forEach(function (f) {
        if (f.key && VEHICLE_KEYS.indexOf(f.key) !== -1) return;
        if (f.isSection) {
          if (f.key === '_vehicle_section') return;
          html += '<div class="section-title">' + esc(f.label) + '</div>';
          return;
        }
        if (f.isCollection && f.collectionType === 'service_group') {
          html +=
            '<label class="starter-field-label"><span class="starter-field-label-text">' + esc(f.label) + '</span>' +
            '<div data-collection-key="' + esc(f.key) + '">' +
            '<div class="starter-service-blocks"></div>' +
            '<button type="button" class="btn btn-ghost collection-add-service" data-key="' + esc(f.key) + '">+ Add service</button>' +
            '</div></label>';
          mounts.push(function () {
            mountServiceCollection(f.key, initialFields[f.key]);
          });
          return;
        }
        var defVal =
          initialFields[f.key] != null && String(initialFields[f.key]) !== ''
            ? String(initialFields[f.key])
            : f.defaultValue != null && f.defaultValue !== ''
              ? String(f.defaultValue)
              : '';
        if (f.multiline) {
          html +=
            '<label class="starter-field-label"><span class="starter-field-label-text">' + esc(f.label) + '</span>' +
            '<textarea id="field-' + esc(f.key) + '" aria-label="' + esc(f.label) + '">' + esc(defVal) + '</textarea></label>';
          return;
        }
        html +=
          '<label class="starter-field-label"><span class="starter-field-label-text">' + esc(f.label) + '</span>' +
          '<input type="text" id="field-' + esc(f.key) + '" value="' + esc(defVal).replace(/"/g, '&quot;') + '" aria-label="' + esc(f.label) + '" /></label>';
      });

      estimateFieldsWrap.innerHTML = html;

      mounts.forEach(function (fn) { fn(); });
      wireInputInvalidation(estimateFieldsWrap);
      estimateFieldsWrap.querySelectorAll('.collection-add-service').forEach(function (btn) {
        btn.addEventListener('click', function () {
          addServiceBlock(btn.getAttribute('data-key'), {});
          onInvalidate();
        });
      });
    }

    function applyPayload(payload) {
      payload = payload || {};
      fillCustomer(payload.customer || {});
      fillVehicleFromFields(payload.fields || {});
      renderFields(payload.fields || {});
    }

    function setFieldSpec(spec) {
      releaseFieldSpec = spec || [];
    }

    return {
      CUSTOMER_IDS: CUSTOMER_IDS,
      VEHICLE_KEYS: VEHICLE_KEYS,
      esc: esc,
      setFieldSpec: setFieldSpec,
      renderFields: renderFields,
      applyPayload: applyPayload,
      collectCustomer: collectCustomer,
      collectFields: collectFields,
      fillCustomer: fillCustomer,
      fillVehicle: fillVehicle,
      wireCustomerVehicleInvalidation: function () {
        CUSTOMER_IDS.forEach(function (f) {
          var el = document.getElementById(f.id);
          if (el) el.addEventListener('input', onInvalidate);
        });
        VEHICLE_KEYS.forEach(function (k) {
          var el = document.getElementById('field-' + k);
          if (el) el.addEventListener('input', onInvalidate);
        });
      }
    };
  }

  global.SuppleDocBuilderForm = {
    create: createFormController,
    CUSTOMER_IDS: CUSTOMER_IDS,
    VEHICLE_KEYS: VEHICLE_KEYS
  };
})(window);
