/**
 * Vehicle fields for estimate / invoice PDFs (controls panel input).
 */

var VEHICLE_RELEASE_FIELD_SPEC = [
  { key: 'vehicle_year', label: 'Year', required: false, defaultValue: '' },
  { key: 'vehicle_make', label: 'Make', required: false, defaultValue: '' },
  { key: 'vehicle_model', label: 'Model', required: false, defaultValue: '' },
  { key: 'vehicle_trim', label: 'Engine / trim', required: false, defaultValue: '' },
  { key: 'vehicle_vin', label: 'VIN', required: false, defaultValue: '' },
  { key: 'vehicle_license_plate', label: 'License plate', required: false, defaultValue: '' },
  { key: 'vehicle_mileage', label: 'Odometer', required: false, defaultValue: '' }
];

function normalizeVehicleReleaseFields(raw) {
  var f = raw || {};
  return {
    year: String(f.vehicle_year == null ? '' : f.vehicle_year).trim(),
    make: String(f.vehicle_make == null ? '' : f.vehicle_make).trim(),
    model: String(f.vehicle_model == null ? '' : f.vehicle_model).trim(),
    trim: String(f.vehicle_trim == null ? '' : f.vehicle_trim).trim(),
    vin: String(f.vehicle_vin == null ? '' : f.vehicle_vin).trim(),
    license_plate: String(f.vehicle_license_plate == null ? '' : f.vehicle_license_plate).trim(),
    mileage: String(f.vehicle_mileage == null ? '' : f.vehicle_mileage).trim()
  };
}

function vehicleFieldsToFormValues(vehicle) {
  var v = vehicle || {};
  return {
    vehicle_year: v.year != null && v.year !== '' ? String(v.year) : '',
    vehicle_make: String(v.make || '').trim(),
    vehicle_model: String(v.model || '').trim(),
    vehicle_trim: String(v.trim || '').trim(),
    vehicle_vin: String(v.vin || '').trim(),
    vehicle_license_plate: String(v.license_plate || '').trim(),
    vehicle_mileage: v.mileage != null && v.mileage !== '' ? String(v.mileage) : ''
  };
}

function hasVehicleInput(vehicleFields) {
  var v = vehicleFields || {};
  return !!(
    v.year ||
    v.make ||
    v.model ||
    v.trim ||
    v.vin ||
    v.license_plate ||
    v.mileage
  );
}

/** Prefer wizard-entered vehicle; fall back to saved customer vehicle. */
function resolveVehicleForDocument(releaseFields, dbVehicle) {
  var manual = normalizeVehicleReleaseFields(releaseFields);
  if (!hasVehicleInput(manual)) return dbVehicle || null;
  var out = {
    year: manual.year ? parseInt(manual.year, 10) : null,
    make: manual.make || '',
    model: manual.model || '',
    trim: manual.trim || null,
    vin: manual.vin || null,
    license_plate: manual.license_plate || null,
    mileage: manual.mileage ? parseInt(manual.mileage, 10) : null
  };
  if (out.year != null && (!isFinite(out.year) || out.year < 1900 || out.year > 2100)) {
    out.year = manual.year;
  }
  if (out.mileage != null && !isFinite(out.mileage)) out.mileage = manual.mileage;
  return out;
}

module.exports = {
  VEHICLE_RELEASE_FIELD_SPEC: VEHICLE_RELEASE_FIELD_SPEC,
  normalizeVehicleReleaseFields: normalizeVehicleReleaseFields,
  vehicleFieldsToFormValues: vehicleFieldsToFormValues,
  resolveVehicleForDocument: resolveVehicleForDocument
};
