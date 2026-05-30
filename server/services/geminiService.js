const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const MODEL_NAME = 'gemini-flash-lite-latest';

class GeminiService {
  constructor() {
    this.genAI = null;
  }

  initialize() {
    if (!this.genAI) {
      if (!process.env.GEMINI_API_KEY) {
        console.error('âŒ GEMINI_API_KEY is not set in environment variables');
        return false;
      }
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      console.log('âœ… Gemini AI initialized successfully');
    }
    return true;
  }

  getModel(systemInstruction) {
    const config = { model: MODEL_NAME };
    if (systemInstruction) config.systemInstruction = systemInstruction;
    return this.genAI.getGenerativeModel(config);
  }

  // Lookup Indian medicine context for drug names mentioned in a message
  async getDrugContext(message) {
    if (!message) return [];
    const words = message.split(/[^a-zA-Z0-9]+/).filter(w => w.length > 3);
    const drugContexts = [];
    const indianMedicineService = require('./indianMedicineService');
    const uniqueWords = [...new Set(words)];
    for (const word of uniqueWords) {
      const med = indianMedicineService.getMedicineByName(word);
      if (med && med.name && med.salt_composition) {
        drugContexts.push({
          name: med.name,
          salt: med.salt_composition,
          description: med.desc || 'N/A',
          sideEffects: med.side_effects || 'N/A',
        });
      }
    }
    return drugContexts.slice(0, 3);
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PATIENT CONTEXT BUILDER
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async buildPatientContext(user) {
    const Allergy = require('../models/Allergy');
    const Prescription = require('../models/Prescription');
    const MedicalRecord = require('../models/MedicalRecord');

    let context = '';

    // Allergy recording instruction
    context += `\n\nALLERGY RECORDING: If the user states they want to add, record, register, or log a new allergy, or says they are allergic to something and wants it in their record, you MUST output a single-line tag:\n` +
      `\`[ADD_ALLERGY:{"allergen":"Allergen Name","type":"drug|food|environmental|other","severity":"mild|moderate|severe|life-threatening","reaction":"reaction description if mentioned"}]\`\n` +
      `Make sure the JSON is valid and outputted strictly on a single line. Along with this tag, provide a warm, friendly textual confirmation that you've registered the allergy in their health vault.`;

    const [allergies, prescriptions, records] = await Promise.all([
      Allergy.find({ patient: user._id, isActive: true }),
      Prescription.find({ patient: user._id, isActive: true }),
      MedicalRecord.find({ patient: user._id, isArchived: false })
        .sort({ recordDate: -1 })
        .limit(10)
        .select('title category recordDate doctorName hospitalName notes aiAnalysis tags'),
    ]);

    // Active allergies â€” critical for medication safety
    if (allergies.length > 0) {
      context += `\n\nCRITICAL â€” PATIENT KNOWN ALLERGIES: ${
        allergies.map(a => `${a.allergen} (severity: ${a.severity}, reaction: ${a.reaction || 'unknown'})`).join(', ')
      }.\nWhen the patient asks about ANY medication, always cross-check against this list. Explicitly warn them if a drug contains or belongs to the same class as a known allergen.`;
    }

    // Active prescriptions
    if (prescriptions.length > 0) {
      const activeMeds = prescriptions.flatMap(p => p.medications.map(m => `${m.name}${m.dosage ? ' ' + m.dosage : ''}${m.frequency ? ' ' + m.frequency : ''}`));
      if (activeMeds.length > 0) {
        context += `\n\nPATIENT ACTIVE PRESCRIPTIONS: ${[...new Set(activeMeds)].join(', ')}.\nUse this to check for drug interactions if they ask about starting new medications.`;
      }
    }

    // AI-analysed medical records
    if (records.length > 0) {
      const analysedSummaries = records
        .filter(r => r.aiAnalysis && (r.aiAnalysis.summary || r.aiAnalysis.extractedData))
        .map(r => {
          const date = r.recordDate
            ? new Date(r.recordDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Unknown date';
          const parts = [`[${r.category.toUpperCase()} â€” ${date}] "${r.title}"`];
          if (r.doctorName) parts.push(`Doctor: ${r.doctorName}`);
          if (r.hospitalName) parts.push(`Hospital: ${r.hospitalName}`);
          if (r.notes) parts.push(`Notes: ${r.notes.substring(0, 150)}`);

          const ed = r.aiAnalysis?.extractedData || {};
          if (ed.conditions?.length) parts.push(`Conditions: ${ed.conditions.join(', ')}`);
          if (ed.medications?.length) {
            const meds = ed.medications.map(m => (typeof m === 'string' ? m : `${m.name || ''}${m.dosage ? ' ' + m.dosage : ''}`)).filter(Boolean);
            if (meds.length) parts.push(`Medications mentioned: ${meds.join(', ')}`);
          }
          if (ed.labResults?.length) {
            const abnormal = ed.labResults.filter(l => l.isAbnormal);
            if (abnormal.length) parts.push(`âš ï¸ Abnormal values: ${abnormal.map(l => `${l.testName} ${l.value}${l.unit || ''} (ref: ${l.referenceRange || '?'})`).join(', ')}`);
          }
          if (ed.vitals) {
            const v = ed.vitals;
            const vitalStr = [v.bp && `BP: ${v.bp}`, v.hr && `HR: ${v.hr}`, v.weight && `Weight: ${v.weight}`].filter(Boolean).join(', ');
            if (vitalStr) parts.push(`Vitals: ${vitalStr}`);
          }
          if (r.aiAnalysis?.summary) {
            parts.push(`AI Summary: ${r.aiAnalysis.summary.substring(0, 500)}${r.aiAnalysis.summary.length > 500 ? '...' : ''}`);
          }
          return parts.join('\n  ');
        });

      const unanalysed = records
        .filter(r => !r.aiAnalysis?.summary)
        .map(r => {
          const date = r.recordDate ? new Date(r.recordDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
          return `${r.category} report "${r.title}" (${date})${r.tags.length ? ' â€” tags: ' + r.tags.join(', ') : ''}`;
        });

      if (analysedSummaries.length > 0) {
        context += `\n\nPATIENT MEDICAL HISTORY (AI-analysed records):\nUse this to give personalised, context-aware responses. Reference specific findings when relevant. Do not expose raw data verbatim â€” integrate it naturally into your responses.\n\n${analysedSummaries.join('\n\n')}`;
      }
      if (unanalysed.length > 0) {
        context += `\n\nAdditional records on file (not yet analysed): ${unanalysed.join('; ')}`;
      }
    }

    return context;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // DOCTOR CONTEXT BUILDER
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async buildDoctorContext(user) {
    const Allergy = require('../models/Allergy');
    const Prescription = require('../models/Prescription');
    const MedicalRecord = require('../models/MedicalRecord');
    const DoctorAccess = require('../models/DoctorAccess');

    let context = '';

    // Doctor identity
    context += `\n\nDOCTOR PROFILE:\n  Name: Dr. ${user.firstName} ${user.lastName}\n  Specialization: ${user.specialization || 'General Practitioner'}`;

    // Allergy recording on behalf of patients
    context += `\n\nALLERGY RECORDING: If the doctor wants to record an allergy for a patient (e.g., "Mark patient X as allergic to Penicillin"), output:\n` +
      `\`[ADD_ALLERGY:{"allergen":"Allergen Name","type":"drug|food|environmental|other","severity":"mild|moderate|severe|life-threatening","reaction":"reaction description","patientName":"Patient Name if mentioned"}]\`\n` +
      `Output this tag strictly on a single line and confirm the action in clinical language.`;

    // Load patients with access
    const accessList = await DoctorAccess.find({ doctor: user._id, isActive: true })
      .populate('patient', 'firstName lastName email dateOfBirth');

    if (accessList.length === 0) {
      context += `\n\nPATIENT PANEL: No patients have shared their records with this doctor yet. The doctor can still use the AI for general clinical reference.`;
      return context;
    }

    // Build per-patient summaries (up to 10 patients)
    const patientSummaries = [];
    const patientsToLoad = accessList.slice(0, 10);

    for (const access of patientsToLoad) {
      const patient = access.patient;
      if (!patient) continue;

      const [records, prescriptions, allergies] = await Promise.all([
        MedicalRecord.find({ patient: patient._id, isArchived: false })
          .sort({ recordDate: -1 })
          .limit(5)
          .select('title category recordDate doctorName hospitalName aiAnalysis tags notes'),
        Prescription.find({ patient: patient._id, isActive: true })
          .select('medications diagnosis prescriptionDate allergyWarnings interactionWarnings'),
        Allergy.find({ patient: patient._id, isActive: true })
          .select('allergen severity reaction type'),
      ]);

      const patientParts = [`Patient: ${patient.firstName} ${patient.lastName} (${patient.email})`];

      // Allergies
      if (allergies.length > 0) {
        patientParts.push(`  âš ï¸ Allergies: ${allergies.map(a => `${a.allergen} [${a.severity}] â†’ ${a.reaction || 'unknown reaction'}`).join(', ')}`);
      } else {
        patientParts.push(`  Allergies: None recorded`);
      }

      // Active medications
      if (prescriptions.length > 0) {
        const activeMeds = prescriptions.flatMap(p =>
          p.medications.map(m => `${m.name}${m.dosage ? ' ' + m.dosage : ''}${m.frequency ? ' ' + m.frequency : ''}`)
        );
        if (activeMeds.length > 0) {
          patientParts.push(`  Active Meds: ${[...new Set(activeMeds)].join(', ')}`);
        }
        const diagnosisList = prescriptions.filter(p => p.diagnosis).map(p => p.diagnosis);
        if (diagnosisList.length > 0) {
          patientParts.push(`  Diagnoses: ${[...new Set(diagnosisList)].join(', ')}`);
        }
        // Allergy/interaction warnings across prescriptions
        const allergyWarnings = prescriptions.flatMap(p => p.allergyWarnings || []);
        if (allergyWarnings.length > 0) {
          patientParts.push(`  âš ï¸ Active Allergy Alerts: ${allergyWarnings.map(w => `${w.matchedMedication} conflicts with ${w.allergen} [${w.severity}]`).join(', ')}`);
        }
      }

      // Recent records
      if (records.length > 0) {
        const recordLines = records.map(r => {
          const date = r.recordDate ? new Date(r.recordDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '?';
          let line = `${r.category} "${r.title}" (${date})`;
          if (r.aiAnalysis?.summary) {
            line += ` â€” ${r.aiAnalysis.summary.substring(0, 300)}${r.aiAnalysis.summary.length > 300 ? '...' : ''}`;
          }
          // Highlight abnormal labs
          const labs = r.aiAnalysis?.extractedData?.labResults?.filter(l => l.isAbnormal) || [];
          if (labs.length > 0) {
            line += ` | âš ï¸ Abnormal: ${labs.map(l => `${l.testName} ${l.value}${l.unit || ''}`).join(', ')}`;
          }
          return `    - ${line}`;
        });
        patientParts.push(`  Recent Records:\n${recordLines.join('\n')}`);
      }

      patientSummaries.push(patientParts.join('\n'));
    }

    if (patientSummaries.length > 0) {
      context += `\n\nPATIENT PANEL (${patientSummaries.length} patients sharing records with you):\nRefer to patient-specific data whenever the doctor asks about a particular patient by name. Cross-reference allergies, active medications, and lab history in your responses.\n\n${patientSummaries.join('\n\n')}`;
    }

    return context;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // MAIN CHAT METHOD
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async chat(userMessage, conversationHistory = [], context = 'general', user = null) {
    if (!this.initialize()) {
      return { success: false, message: 'AI service not configured. Please set GEMINI_API_KEY.' };
    }

    try {
      const isDoctor = user && user.role === 'doctor';
      const isPatient = user && user.role === 'patient';

      // Select the appropriate system prompt based on role and context
      let systemPrompt = isDoctor
        ? this.getDoctorSystemPrompt(context)
        : this.getPatientSystemPrompt(context);

      let additionalContext = '';

      // Build role-specific context injection
      if (isPatient) {
        additionalContext = await this.buildPatientContext(user);
      } else if (isDoctor) {
        additionalContext = await this.buildDoctorContext(user);
      }

      // Add Indian medicine DB context if drug names detected in message
      const drugContexts = await this.getDrugContext(userMessage);
      if (drugContexts.length > 0) {
        additionalContext += `\n\nINDIAN MEDICINE REFERENCE DATABASE:\n` +
          drugContexts.map(d =>
            `- Drug: ${d.name}\n  Composition: ${d.salt}\n  Description: ${d.description}\n  Side Effects: ${d.sideEffects}`
          ).join('\n');
      }

      const fullSystemPrompt = systemPrompt + additionalContext;
      const model = this.getModel(fullSystemPrompt);

      // Build conversation history (last 10 turns, alternating user/model)
      const rawHistory = conversationHistory.slice(-10);
      const formattedHistory = rawHistory
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));

      const validHistory =
        formattedHistory.length > 0 && formattedHistory[0].role === 'user'
          ? formattedHistory
          : [];

      const chat = model.startChat({
        history: validHistory,
        generationConfig: {
          maxOutputTokens: 1536,
          temperature: isDoctor ? 0.4 : 0.7, // Doctors get more precise, factual responses
        },
      });

      const result = await chat.sendMessage(userMessage);
      const response = result.response.text();

      return { success: true, message: response };
    } catch (error) {
      console.error('Gemini Chat Error:', error.message);
      return { success: false, message: 'AI service temporarily unavailable. Please try again.' };
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PATIENT SYSTEM PROMPTS
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getPatientSystemPrompt(context) {
    const basePersonalisation = `\nPERSONALISATION: You have access to this patient's actual medical records, allergies, prescriptions, and lab data above. Always refer to their personal data when relevant. Acknowledge specific conditions, test results, or medications from their history when they ask. If no relevant data exists, respond generally but empathetically. Never invent medical data about the patient.`;

    const prompts = {
      general: `You are MeriNurse â€” a personal AI health companion integrated with the patient's health vault.

ROLE & TONE:
- Warm, empathetic, and supportive like a knowledgeable friend â€” not robotic
- Address the patient by first name when possible; make them feel heard
- Translate complex medical language into simple, clear terms
- Always end by encouraging them to speak with their doctor for clinical decisions

CAPABILITIES:
- Explain their lab reports, diagnoses, medications, and medical history from context
- Check if a drug they're asking about conflicts with their known allergies
- Help them understand what questions to ask their doctor at their next appointment
- Discuss general wellness, nutrition, symptoms, and mental health in a supportive way
- Record allergies conversationally using the [ADD_ALLERGY:...] tag format

STRICT RULES:
- NEVER diagnose conditions or prescribe medications
- NEVER make up health data about the patient
- If they describe an emergency (chest pain, severe difficulty breathing, etc.) â€” tell them to call emergency services immediately
- Always recommend a doctor for clinical decisions${basePersonalisation}`,

      'symptom-check': `You are MeriNurse Symptom Checker â€” a thoughtful, careful AI health guide.

ROLE & TONE:
- Calm, thorough, and reassuring â€” help the patient understand their symptoms without causing anxiety
- Ask focused clarifying questions: onset, duration, severity, associated symptoms, any triggers
- Cross-reference symptoms with the patient's KNOWN conditions and medical history before responding

APPROACH:
- List possible explanations in order from most to least likely, based on symptoms and patient history
- Clearly identify any RED FLAG symptoms that need immediate care (e.g., crushing chest pain, sudden vision loss, signs of stroke)
- Always end with a clear recommendation on whether they should: self-care at home, schedule a GP appointment, or go to emergency care
- NEVER diagnose â€” frame as "possible explanations" or "common causes"${basePersonalisation}`,

      medication: `You are MeriNurse Medication Guide â€” a safe, knowledgeable medication assistant.

ROLE & TONE:
- Precise and safety-focused â€” medication errors are dangerous
- Cross-check every drug they ask about against their known ALLERGIES and ACTIVE PRESCRIPTIONS
- Speak clearly without unnecessary jargon

CAPABILITIES:
- Explain what a medication is for, how it works, and common side effects
- Check for known drug interactions with their active medications
- Warn clearly and urgently if a drug conflicts with a known allergen
- Advise on proper timing, food interactions, and what to do if a dose is missed
- NEVER recommend starting, stopping, or changing medication without doctor approval${basePersonalisation}`,

      nutrition: `You are MeriNurse Nutrition Assistant â€” a personalised dietary advisor.

ROLE & TONE:
- Evidence-based, practical, and encouraging
- Consider the patient's known health conditions when giving dietary advice (e.g., diabetic patients need low-GI foods)

CAPABILITIES:
- Suggest balanced meal plans appropriate to their health conditions
- Explain which foods to avoid given their diagnoses
- Discuss supplements, hydration, and healthy lifestyle habits
- Refer to a registered dietitian for specific medical diet plans${basePersonalisation}`,

      'mental-health': `You are MeriNurse Wellness Companion â€” a safe mental health support assistant.

ROLE & TONE:
- Non-judgmental, compassionate, and trauma-informed
- Validate the patient's feelings before offering any suggestions
- Never trivialise mental health concerns

CAPABILITIES:
- Provide general coping strategies (breathing exercises, grounding techniques, sleep hygiene)
- Discuss stress, anxiety, depression, and burnout in an accessible way
- Always encourage professional support from a licensed therapist or psychiatrist for ongoing issues
- CRITICAL: If the patient expresses suicidal ideation or self-harm intent, respond with empathy, provide VANDREVALA Foundation helpline (1860-2662-345) and iCall (9152987821) immediately${basePersonalisation}`,
    };

    return prompts[context] || prompts.general;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // DOCTOR SYSTEM PROMPTS
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getDoctorSystemPrompt(context) {
    const basePersonalisation = `\nCLINICAL CONTEXT: You have access to this doctor's patient panel above â€” their active medications, lab results, allergies, and recent record summaries. Reference specific patient data accurately when the doctor asks about a patient by name. Cross-reference patient histories when suggesting diagnoses or treatments. Never fabricate clinical data.`;

    const prompts = {
      general: `You are MeriNurse Clinical AI â€” an advanced AI clinical co-pilot for medical professionals.

ROLE & TONE:
- Precise, evidence-based, and clinically authoritative
- Speak in appropriate medical terminology â€” the user is a trained healthcare professional
- Be concise and actionable â€” doctors need information quickly
- Supplement clinical reasoning, never replace it

CAPABILITIES:
- Review and summarise patient charts, lab reports, and medical history on demand
- Assist with differential diagnosis by systematically listing probabilities based on clinical findings
- Flag drug-allergy conflicts, dangerous interactions, and contraindications in the patient's chart
- Reference current clinical guidelines (WHO, ICMR, NICE) where relevant
- Help with prescription decisions, dosage calculations, and treatment protocol questions
- Identify patterns across a patient's lab history (e.g., worsening renal function over time)

STRICT RULES:
- Always caveat AI-generated clinical suggestions â€” the doctor retains full clinical responsibility
- Flag any CRITICAL abnormalities (e.g., critical lab values, red flag symptoms) at the top of the response
- If a patient's data reveals an urgent finding, mention it explicitly even if not asked${basePersonalisation}`,

      'doctor-diagnosis': `You are MeriNurse Differential Diagnosis Engine â€” a structured clinical reasoning assistant.

APPROACH TO EVERY QUERY:
1. Identify the key presenting features (symptoms, signs, lab values, history)
2. Generate a ranked differential diagnosis list with likelihood rationale
3. Suggest discriminating investigations to narrow the differential
4. Highlight any RED FLAG features that mandate urgent or emergency action
5. Reference relevant clinical guidelines or scoring systems where applicable (e.g., Wells Score, CURB-65, SOFA)

STYLE: Structured, methodical, and clinically precise. Use medical shorthand where appropriate (SOB, HTN, DM2, etc.)${basePersonalisation}`,

      'doctor-prescription': `You are MeriNurse Prescribing Assistant â€” a clinical pharmacology and drug safety advisor.

CAPABILITIES:
- Recommend appropriate drug choices, doses, and durations for common conditions based on patient data
- Cross-check prescriptions against the patient's known allergies and current medications
- Identify clinically significant drug interactions and contraindications
- Provide dosing adjustments for renal/hepatic impairment if indicated
- Reference standard Indian formulary (NLEM, Essential Medicines List) and BNF where relevant
- Help with antibiotic stewardship â€” suggest narrow-spectrum options where appropriate

RULES:
- Always warn about patient-specific allergy conflicts with URGENCY
- Recommend therapeutic monitoring for drugs with narrow therapeutic index
- Always remind the doctor that final prescribing decision rests with them${basePersonalisation}`,

      'doctor-records': `You are MeriNurse Chart Review Assistant â€” a clinical records analysis specialist.

CAPABILITIES:
- Summarise and synthesise a patient's full medical history from uploaded records
- Extract key clinical trends (rising creatinine, worsening HbA1c, recurrent infections, etc.)
- Identify gaps in care (overdue investigations, missed follow-ups, incomplete vaccinations)
- Compare current lab values to historical values and flag significant changes
- Highlight abnormal findings that may have been missed or inadequately addressed
- Prepare structured clinical summaries suitable for referral letters or case notes${basePersonalisation}`,
    };

    // Map generic contexts to doctor-appropriate defaults
    const contextMap = {
      general: 'general',
      diagnosis: 'doctor-diagnosis',
      'doctor-diagnosis': 'doctor-diagnosis',
      prescription: 'doctor-prescription',
      'doctor-prescription': 'doctor-prescription',
      records: 'doctor-records',
      'doctor-records': 'doctor-records',
    };

    const mapped = contextMap[context] || 'general';
    return prompts[mapped];
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // DOCUMENT ANALYSIS
  // viewer = the logged-in user (patient or doctor), patient = the record owner
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async analyzeDocument(filePath, analysisType = 'general', viewer = null, patient = null) {
    if (!this.initialize()) {
      return { success: false, message: 'AI Vision service not configured.' };
    }

    try {
      const ext = path.extname(filePath).toLowerCase();
      const isDoctor = viewer && viewer.role === 'doctor';
      const patientName = patient
        ? `${patient.firstName} ${patient.lastName}`
        : (viewer && viewer.role === 'patient' ? `${viewer.firstName} ${viewer.lastName}` : null);

      const prompt = this.getAnalysisPrompt(analysisType, isDoctor, patientName);
      const model = this.getModel();

      if (ext === '.pdf') {
        const pdfFallbackPrompt = `A ${isDoctor ? 'doctor' : 'patient'} has uploaded a medical PDF (type: "${analysisType}")${
          patientName ? ` for patient ${patientName}` : ''
        }. The document cannot be rendered directly. Write a short, friendly paragraph explaining that PDF files cannot be read automatically, and suggest the user re-upload as an image (JPG/PNG) for AI analysis. Keep it brief and helpful.`;
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: pdfFallbackPrompt }] }],
        });
        return { success: true, analysis: result.response.text(), analyzedAt: new Date() };
      }

      const imageData = fs.readFileSync(filePath);
      const mimeType = this.getMimeType(filePath);

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: imageData.toString('base64'), mimeType } },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.15,
        },
      });

      return { success: true, analysis: result.response.text(), analyzedAt: new Date() };
    } catch (error) {
      console.error('Gemini Vision Error:', error.message);
      return { success: false, message: `Document analysis failed: ${error.message}` };
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ANALYSIS PROMPTS â€” Clean, human-readable, conversational prose
  // isDoctor: changes tone from plain-language to clinical; patientName: personalises output
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getAnalysisPrompt(type, isDoctor = false, patientName = null) {
    const name = patientName || (isDoctor ? 'the patient' : 'you');
    const possessive = patientName ? `${patientName}'s` : (isDoctor ? "the patient's" : 'your');

    // These two machine-readable blocks stay hidden from the prose output
    const allergyExtract = `\n\n---\nALLERGY EXTRACTION (machine-readable, separate from prose): If you see any allergy mentioned anywhere, output on its own line: DETECTED_ALLERGIES_JSON:[{"allergen":"...","severity":"mild|moderate|severe|life-threatening","reaction":"..."}] â€” if none found: DETECTED_ALLERGIES_JSON:[]`;
    const dataExtract = `\nEXTRACTED_DATA_JSON:{"conditions":[],"medications":[{"name":"","dosage":"","frequency":"","duration":""}],"labResults":[{"testName":"","value":"","unit":"","referenceRange":"","isAbnormal":false,"severity":"normal|borderline|abnormal|critical"}],"vitals":{"bp":null,"hr":null,"temperature":null,"weight":null,"height":null,"spo2":null},"clinicalFindings":"","recommendations":"","followUpRequired":false}`;

    const toneGuide = isDoctor
      ? `Write in clear clinical language suitable for a doctor reviewing ${possessive} case. Be precise with values, units, and clinical interpretation. Flag critical findings explicitly.`
      : `Write in plain, friendly language ${name} can easily understand â€” no medical jargon without explanation. Be warm and reassuring unless there is something genuinely urgent.`;

    const prompts = {
      general: `You are reading a medical document image. ${toneGuide}

Write a concise paragraph or two that covers what this document is, what the key information says, and whether there is anything important or unusual that ${name} should be aware of. If you see any test results, mention the actual numbers. If you see medications, list them clearly. If there is anything that needs medical attention, say so plainly and advise ${name} to follow up with their doctor.

Do not use numbered steps, section headers, tables, or structured templates in your response â€” just write naturally as if you are explaining it to ${name} in conversation. If the image is unclear or the document type is hard to read, say so honestly.${allergyExtract}${dataExtract}`,

      'lab-report': `You are reading a lab report image. ${toneGuide}

Start with one sentence describing what type of blood/urine test this is and when it was done (if visible). Then go through each test result that is visible. For each one, mention the value and whether it is within the normal range. If something is outside the normal range, say exactly what the value is, what the normal range is, and briefly explain what that might mean in simple terms. Use âš ï¸ for anything abnormal and ðŸš¨ for anything critically outside range that needs urgent attention.

End with 2â€“3 sentences summarising the overall picture â€” is everything mostly normal, are there a few things to watch, or is there something that needs prompt medical review? Recommend they share this with their doctor if anything is flagged.

Write in flowing paragraphs â€” no numbered steps, no tables, no STEP headings. Mention actual numbers, not just "elevated" or "low".${allergyExtract}${dataExtract}`,

      prescription: `You are reading a prescription image. ${toneGuide}

List each medication you can see, stating the name, dose, how often to take it, and for how long â€” in plain language. If the prescription shows a diagnosis or reason for the medicines, mention that too. If there are any special instructions (take with food, avoid alcohol, etc.), include them.

Close with a sentence or two about what these medicines are generally used for, and remind ${name} to take them exactly as prescribed and to contact their doctor with any concerns or side effects.

Write naturally in short paragraphs â€” no STEP headers, no bullet tables. If anything in the prescription is unclear or hard to read, say so.${allergyExtract}${dataExtract}`,

      imaging: `You are reading a radiology/imaging report or scan image. ${toneGuide}

Explain what type of scan or imaging this is (X-ray, CT, MRI, ultrasound, ECG, etc.) and what body part was examined. Then describe what the report or image shows â€” what is normal, what (if anything) is abnormal or unusual. Use plain language: instead of saying "consolidation" alone, add "which means a part of the lung appears filled or solid". Flag anything significant with âš ï¸.

End with the overall impression or conclusion, and whether the findings suggest any follow-up is needed.

Write as clear, flowing prose â€” no numbered steps, no structured headers.${allergyExtract}${dataExtract}`,

      'discharge-summary': `You are reading a hospital discharge summary. ${toneGuide}

Summarise ${possessive} hospital stay in a clear, friendly way: why ${name} was admitted, what happened during the stay, what treatments or procedures were done, and what the final diagnosis was. Then explain the discharge medications â€” what each one is for and how to take it.

Mention any follow-up appointments, tests, or care instructions the document specifies. If there are warning signs listed for when to return to the hospital, highlight those clearly.

Write conversationally in 3â€“5 short paragraphs â€” no STEP headers, no clinical template format.${allergyExtract}${dataExtract}`,

      consultation: `You are reading a doctor's consultation note. ${toneGuide}

Describe what ${name} came in for, what the doctor found on examination (including any vital signs if visible), and what the doctor's assessment or working diagnosis was. Then explain what the plan is â€” any medications prescribed, tests ordered, or referrals made.

Keep it conversational and clear â€” explain any medical terms simply. End with a brief reminder of any follow-up steps the note mentions.

Write in natural paragraphs â€” no STEP headers or clinical template formatting.${allergyExtract}${dataExtract}`,
    };

    return prompts[type] || prompts.general;
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
}

module.exports = new GeminiService();
