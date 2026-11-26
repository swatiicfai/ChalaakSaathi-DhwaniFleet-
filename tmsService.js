const { Behavior } = require('@google/genai');
const db = require('./db');

/**
 * Gemini 3.8 Live non-blocking function declarations for atomic cold-chain & TMS operations.
 */
const FUNCTION_DECLARATIONS = [
  {
    name: 'verify_eway_bill',
    description:
      'Verifies an Indian NIC e-Way Bill number against the cold-chain dispatch ledger and marks gate clearance.',
    behavior: Behavior.NON_BLOCKING,
    parameters: {
      type: 'OBJECT',
      properties: {
        eway_bill_number: {
          type: 'STRING',
          description: 'NIC e-Way Bill reference number spoken by driver, e.g., 408 or EWB-408'
        }
      },
      required: ['eway_bill_number']
    }
  },
  {
    name: 'update_tms_dock_slot',
    description:
      'Updates warehouse dock gate or bay assignment for the truck in the Transport Management System.',
    behavior: Behavior.NON_BLOCKING,
    parameters: {
      type: 'OBJECT',
      properties: {
        gate_number: {
          type: 'STRING',
          description: 'The new gate or bay number, e.g., Gate 2 - Bay 4, Bay 4'
        },
        reason: {
          type: 'STRING',
          description: 'Reason for bay reassignment, e.g., Bay 2 chiller failure'
        }
      },
      required: ['gate_number']
    }
  },
  {
    name: 'log_reefer_temperature_excursion',
    description:
      'Logs a cold-chain reefer temperature reading or excursion (> 4.0 C) and alerts Pharma QA.',
    behavior: Behavior.NON_BLOCKING,
    parameters: {
      type: 'OBJECT',
      properties: {
        current_temp: {
          type: 'NUMBER',
          description: 'Current reefer container temperature reading in Celsius'
        },
        status: {
          type: 'STRING',
          enum: ['NORMAL', 'WARNING_EXCURSION', 'CRITICAL_EXCURSION'],
          description: 'Severity status based on 2-8C threshold (> 4.0C warning, >= 5.0C critical)'
        }
      },
      required: ['current_temp', 'status']
    }
  },
  {
    name: 'file_detention_demurrage_claim',
    description:
      'Starts the official demurrage compensation clock (INR 2,200/hr) and files a detention claim against the consignee warehouse.',
    behavior: Behavior.NON_BLOCKING,
    parameters: {
      type: 'OBJECT',
      properties: {
        warehouse_name: {
          type: 'STRING',
          description: 'Warehouse or cold-storage hub name'
        },
        detention_hours: {
          type: 'NUMBER',
          description: 'Estimated or current detention duration in hours'
        }
      },
      required: ['warehouse_name']
    }
  },
  {
    name: 'generate_shareable_voice_incident_card',
    description:
      'Curates the spoken driver incident update into a shareable bilingual Voice Incident POD Card for WhatsApp dispatch.',
    behavior: Behavior.NON_BLOCKING,
    parameters: {
      type: 'OBJECT',
      properties: {
        summary: {
          type: 'STRING',
          description: 'Concise summary of the gate incident, temperature, bay shift, and actions taken'
        },
        vernacular_language: {
          type: 'STRING',
          description: 'Detected language/dialect, e.g., Hinglish / Punjabi, Tamil / Tanglish, Marathi'
        },
        urgency: {
          type: 'STRING',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        }
      },
      required: ['summary', 'vernacular_language']
    }
  }
];

function nowTime() {
  return new Date().toLocaleTimeString();
}

const TOOL_HANDLERS = {
  verify_eway_bill: (args = {}) => {
    const rawNo = String(args.eway_bill_number || '408').trim();
    const record = db.lookupEwayBill(rawNo);
    if (!record) {
      db.updateEwayBillStatus(rawNo, 'UNVERIFIED_MANUAL_CHECK');
      db.addAuditLog(`NIC e-Way Bill [${rawNo}] not found in pre-clearance registry. Flagged for manual check.`, 'warning');
      return {
        status: 'NOT_FOUND',
        eway_bill_number: rawNo,
        message: `e-Way Bill ${rawNo} was not found in the active manifest; flagged for supervisor verification.`
      };
    }

    db.updateEwayBillStatus(record.eway_bill_no, 'VERIFIED_ACTIVE');
    db.addAuditLog(
      `NIC e-Way Bill #${record.eway_bill_no} verified in SQLite (${record.origin} -> ${record.destination}, valid: ${record.valid_until}).`,
      'success'
    );
    return {
      status: 'VERIFIED',
      eway_bill_number: record.eway_bill_no,
      truck_id: record.truck_id,
      origin: record.origin,
      destination: record.destination,
      cargo_type: record.cargo_type,
      valid_until: record.valid_until,
      message: `e-Way Bill ${record.eway_bill_no} verified and cleared for gate entry.`
    };
  },

  update_tms_dock_slot: (args = {}) => {
    const requestedBay = String(args.gate_number || 'Bay 4').trim();
    const formattedBay = /gate/i.test(requestedBay) ? requestedBay : `Gate 2 - ${requestedBay}`;
    const oldBay = db.updateDockSlot(formattedBay);
    const reason = args.reason || 'Guard instructed / bay chiller reallocation';
    const gatePass = 'GP-' + Math.floor(1000 + Math.random() * 9000);

    db.addAuditLog(`TMS Dock Slot mutated in SQLite: [${oldBay}] -> [${formattedBay}]. Reason: ${reason}. GatePass: ${gatePass}`, 'success');
    return {
      status: 'SUCCESS',
      previous_bay: oldBay,
      new_bay: formattedBay,
      dock_supervisor_alerted: true,
      e_gate_pass_code: gatePass,
      message: `Dock slot updated to ${formattedBay}. E-Gate pass ${gatePass} issued and supervisor notified.`
    };
  },

  log_reefer_temperature_excursion: (args = {}) => {
    const state = db.getState();
    const temp = Number.isFinite(Number(args.current_temp)) ? Number(args.current_temp) : 5.4;
    const status = args.status || (temp >= 5.0 ? 'CRITICAL_EXCURSION' : temp > 4.0 ? 'WARNING_EXCURSION' : 'NORMAL');
    const ticketId = 'CC-EXC-' + Math.floor(10000 + Math.random() * 90000);
    const ticket = {
      id: ticketId,
      timestamp: nowTime(),
      temp,
      status,
      cargo: state.cargoType,
      action: 'Emergency cooling protocol triggered & Pharma QA alerted.'
    };

    db.insertExcursionTicket(ticket);
    db.addAuditLog(
      `Cold-Chain Excursion persisted in SQLite! Temp: ${temp.toFixed(1)}°C (${status}). Ticket ${ticketId} created.`,
      'danger'
    );
    return {
      status: 'LOGGED_CRITICAL',
      ticket_id: ticketId,
      recorded_temp: temp,
      severity: status,
      pharma_compliance_logged: true,
      message: `Reefer temperature ${temp.toFixed(1)}°C recorded under ticket ${ticketId}. Pharma QA and chiller technician alerted.`
    };
  },

  file_detention_demurrage_claim: (args = {}) => {
    const state = db.getState();
    const hours = Number.isFinite(Number(args.detention_hours)) && Number(args.detention_hours) > 0
      ? Number(args.detention_hours)
      : 2.0;
    const rate = state.detentionRatePerHour || 2200;
    const totalInr = Math.round(hours * rate);
    const warehouseName = String(args.warehouse_name || 'Sonipat Cold Hub').trim();
    const claimId = 'DEM-' + Math.floor(1000 + Math.random() * 9000);

    db.insertDemurrageClaim({
      id: claimId,
      warehouseName,
      detentionHours: hours,
      ratePerHour: rate,
      totalClaimInr: totalInr,
      timestamp: nowTime()
    });
    db.addAuditLog(
      `Demurrage claim ${claimId} saved to SQLite: ${hours} hrs @ ₹${rate}/hr = ₹${totalInr.toLocaleString('en-IN')} (${warehouseName}).`,
      'warning'
    );

    return {
      status: 'DEMURRAGE_CLAIM_FILED',
      claim_id: claimId,
      warehouse_name: warehouseName,
      hours_billed: hours,
      rate_per_hour: rate,
      total_claim_inr: totalInr,
      transporter_notified: true,
      message: `Official detention claim ${claimId} filed against ${warehouseName} for ₹${totalInr}.`
    };
  },

  generate_shareable_voice_incident_card: (args = {}) => {
    const cardId = 'CARD-' + Math.floor(1000 + Math.random() * 9000);
    const card = {
      id: cardId,
      timestamp: nowTime(),
      summary:
        args.summary ||
        'Driver reported Bay 2 chiller breakdown and reefer temperature spike. Re-routed to Bay 4 and demurrage claim locked.',
      language: args.vernacular_language || 'Hinglish / Punjabi',
      urgency: args.urgency || 'HIGH',
      shareUrl: `https://chalaaksaathi.in/incident/${cardId}`
    };

    db.insertIncidentCard(card);
    db.addAuditLog(
      `Bonus: Bilingual Voice Incident Card [${cardId}] (${card.language}) persisted for WhatsApp POD dispatch.`,
      'bonus'
    );

    return {
      status: 'CREATED',
      card_id: cardId,
      share_url: card.shareUrl,
      language: card.language,
      whatsapp_dispatch_ready: true,
      message: `Voice Incident Card ${cardId} generated in ${card.language} and queued for WhatsApp POD dispatch.`
    };
  }
};

function executeTool(name, args) {
  const handler = TOOL_HANDLERS[name];
  if (!handler) {
    return { error: `Unknown tool: ${name}` };
  }
  return handler(args);
}

module.exports = {
  FUNCTION_DECLARATIONS,
  executeTool
};
