// POST: Generate questions from text using AI
// Admin provides text, system generates 5 multiple-choice questions

import { corsHeaders, requireAdmin } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const body = await context.request.json();
    const { text, exam_type, num_questions } = body;

    if (!text || text.length < 50) {
      return new Response(JSON.stringify({ error: 'El texto debe tener al menos 50 caracteres para generar preguntas' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    var n = Math.min(Math.max(num_questions || 5, 1), 20);

    // Build prompt based on exam type
    var examInstructions = '';
    if (exam_type === 'multiple_choice') {
      examInstructions = 'Multiple choice: 4 options (option_a, option_b, option_c, option_d). correct_answer must be one of: a, b, c, or d.';
    } else if (exam_type === 'number_select') {
      examInstructions = 'Number select: options are numbers. The correct_answer is the exact number string. Example: option_a="1", option_b="2", option_c="3", option_d="4", correct_answer="2".';
    } else if (exam_type === 'true_false_none') {
      examInstructions = 'True/false/none: option_a is a true statement, option_b is a false statement, option_c is "Ninguna de las anteriores". correct_answer is a, b, or c.';
    }

    var prompt = 'Genera ' + n + ' preguntas de evaluacion basadas en el siguiente texto educativo. Tipo de examen: ' + exam_type + '\n\n';
    prompt += 'Texto:\n' + text.substring(0, 3000) + '\n\n';
    prompt += 'Responde SOLO con un JSON array, sin texto adicional. Cada pregunta debe tener este formato exacto:\n';
    prompt += '[{"question":"texto de la pregunta","option_a":"opcion A","option_b":"opcion B","option_c":"opcion C","option_d":"opcion D","correct_answer":"a","explanation":"explicacion de por que es correcta","points":10}]\n';
    prompt += 'Las preguntas deben ser relevantes al texto, claras y con solo una respuesta correcta. Variable la dificultad. Points entre 5 y 20 segun dificultad.';

    // Call AI API (Cloudflare Workers AI or external)
    var aiResponse;
    try {
      // Try Cloudflare Workers AI first
      if (env.AI) {
        var aiResp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
        });
        aiResponse = aiResp.response || aiResp.answer || '';
      }
    } catch(e) {
      console.log('CF AI not available, trying fallback');
    }

    if (!aiResponse) {
      // Fallback: use a simple question extraction from text
      aiResponse = generateFallbackQuestions(text, n, exam_type);
    }

    // Parse JSON from response
    var questions = [];
    try {
      // Try to extract JSON array from response
      var jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    } catch(e) {
      // If AI response can't be parsed, use fallback
      questions = generateFallbackQuestions(text, n, exam_type);
      questions = typeof questions === 'string' ? JSON.parse(questions) : questions;
    }

    // Validate and normalize questions
    var valid = [];
    for (var i = 0; i < questions.length && valid.length < n; i++) {
      var q = questions[i];
      if (q.question && q.option_a && q.option_b && q.correct_answer) {
        valid.push({
          question: q.question.substring(0, 500),
          option_a: String(q.option_a || '').substring(0, 200),
          option_b: String(q.option_b || '').substring(0, 200),
          option_c: String(q.option_c || '').substring(0, 200),
          option_d: String(q.option_d || '').substring(0, 200),
          correct_answer: String(q.correct_answer).toLowerCase().charAt(0),
          explanation: String(q.explanation || '').substring(0, 500),
          points: parseInt(q.points) || 10,
          sort_order: i,
        });
      }
    }

    return new Response(JSON.stringify({
      questions: valid,
      count: valid.length,
      source: env.AI ? 'ai_generated' : 'template_generated',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al generar preguntas', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Fallback: generate template questions from text when AI is not available
function generateFallbackQuestions(text, n, examType) {
  var sentences = text.replace(/\n+/g, '. ').split(/[.!?]+/).filter(function(s) { return s.trim().length > 20; });
  var questions = [];

  for (var i = 0; i < Math.min(n, sentences.length); i++) {
    var sentence = sentences[i].trim();
    if (examType === 'true_false_none') {
      questions.push({
        question: 'Segun el texto: "' + sentence.substring(0, 200) + '" - Esta afirmacion es:',
        option_a: 'Verdadera',
        option_b: 'Falsa',
        option_c: 'Ninguna de las anteriores',
        option_d: 'Todas las anteriores',
        correct_answer: 'a',
        explanation: 'Basado en el contenido del texto proporcionado.',
        points: 10,
      });
    } else if (examType === 'number_select') {
      questions.push({
        question: 'Cuantos puntos clave se mencionan en el siguiente fragmento: "' + sentence.substring(0, 150) + '"?',
        option_a: '1',
        option_b: '2',
        option_c: '3',
        option_d: '4',
        correct_answer: 'b',
        explanation: 'Analiza el fragmento para determinar la cantidad correcta.',
        points: 10,
      });
    } else {
      questions.push({
        question: 'Cual de las siguientes opciones resume mejor: "' + sentence.substring(0, 200) + '"?',
        option_a: sentence.substring(0, 100) + ' (opcion principal)',
        option_b: 'Una interpretacion alternativa del contenido',
        option_c: 'Un punto de vista opuesto al descrito',
        option_d: 'Ninguna relacion con el texto',
        correct_answer: 'a',
        explanation: 'La opcion A corresponde directamente al contenido del texto.',
        points: 10,
      });
    }
  }

  return questions;
}
