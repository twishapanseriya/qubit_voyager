// Use a function to safely load global variables for non-Canvas environments
const getGlobalVar = (name, defaultValue) => typeof window[name] !== 'undefined' ? window[name] : defaultValue;

// Firebase setup variables (kept for consistency with Canvas environment requirements)
const appId = getGlobalVar('__app_id', 'default-app-id');
const firebaseConfig = JSON.parse(getGlobalVar('__firebase_config', '{}'));
const initialAuthToken = getGlobalVar('__initial_auth_token', undefined);

// --- TIMER AND SCORE VARIABLES ---
const TIME_LIMIT_SECONDS = 90; // 1 minute 30 seconds
let timeLeft = TIME_LIMIT_SECONDS;
let timerInterval;
let currentQuestionIndex = 0;
let score = 0;
let isAnswerLocked = false;

// --- DOM Elements ---
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const questionTextElement = document.getElementById('question-text');
const optionButtons = [
    document.getElementById('option-A'),
    document.getElementById('option-B'),
    document.getElementById('option-C'),
    document.getElementById('option-D')
];
const quizModal = document.getElementById('quiz-modal');
const modalTitleElement = document.getElementById('modal-title');
const finalScoreElement = document.getElementById('final-score');

// --- GAME DATA ---
// Array of quantum quiz questions. The options must be stored as LaTeX for MathJax rendering.
const quizData = [
    {
        question: "Apply (H ⊗ H) to |00>.",
        options: {
            A: "$$|00\\rangle$$",
            B: "$$\\frac{|00\\rangle+|01\\rangle+|10\\rangle+|11\\rangle}{2}$$",
            C: "$$\\frac{|00\\rangle-|01\\rangle}{\\sqrt{2}}$$",
            D: "$$|11\\rangle$$"
        },
        answer: "B"
    },
    {
        question: "Apply I⊗X (identity on qubit 1, X on qubit 0) to |01>.",
        options: {
            A: "$$|11\\rangle$$", 
            B: "$$|00\\rangle$$",
            C: "$$|10\\rangle$$", 
            D: "$$|01\\rangle$$" 
        },
        answer: "A" 
    },
    {
        question: "Apply H on qubit 0 of |01>.",
        options: {
            A: "$$\\frac{|00\\rangle+|01\\rangle}{\\sqrt{2}}$$ ",
            B: "$$\\frac{|00\\rangle-|01\\rangle}{\\sqrt{2}}$$ ",
            C: "$$\\frac{|01\\rangle+|11\\rangle}{\\sqrt{2}}$$ ", 
            D: "$$\\frac{|01\\rangle+|00\\rangle}{\\sqrt{2}}$$ "
        },
        answer: "C"
    },
    {
        question: "Apply a CNOT (control = 0, target = 1) to the Bell state $$\\frac{|00>+|10>}{\\sqrt{2}}$$. What is the result?",
        options: {
            A: "$$|00\\rangle$$", 
            B: "$$\\frac{|01\\rangle+|11\\rangle}{\\sqrt{2}}$$ (Q0 is control)", 
            C: "$$|11\\rangle$$",
            D: "$$\\frac{|00\\rangle+|11\\rangle}{\\sqrt{2}}$$" 
        },
        answer: "B"
    },
    {
        question: "If a CNOT gate is applied (with control qubit 1 and target qubit 0) to the state |11>, what is the result?",
        options: {
            A: "$$|11\\rangle$$",
            B: "$$|01\\rangle$$", 
            C: "$$|10\\rangle$$", 
            D: "$$|00\\rangle$$"
        },
        answer: "B"
    },
    {
        question: "What is the output of applying a Hadamard gate to the first qubit of |00>, followed by a CNOT gate (control: qubit 0, target: qubit 1)?",
        options: {
            A: "$$|00\\rangle$$",
            B: "$$\\frac{1}{\\sqrt{2}}(|00\\rangle +|11\\rangle )$$", 
            C: "$$\\frac{1}{\\sqrt{2}}(|01\\rangle +|10\\rangle )$$",
            D: "$$|11\\rangle$$"
        },
        answer: "B"
    },
    {
        question: "To convert |1> to |->=1/√2(|0> -|1>), which gates should be applied?",
        options: {
            A: "Hadamard then Pauli Z",
            B: "Pauli-X then Hadamard then Pauli-Z", 
            C: "Pauli-Z then Hadamard",
            D: "Pauli-X then Hadamard"
        },
        answer: "B"
    },
    {
        question: "Which gate sequence transforms |0> into |-> =1/√2(|0> -|1>)?",
        options: {
            A: "Hadamard then Pauli-Z", 
            B: "Pauli-Z then Hadamard",
            C: "Pauli-X then Hadamard",
            D: "Hadamard only"
        },
        answer: "A"
    },
    {
        question: "To convert |1> to 1/√2(|0> +|1>), which gate sequence should be applied?",
        options: { 
            A: "Hadamard",
            B: "Pauli-X followed by Hadamard", 
            C: "Hadamard followed by Pauli-X",
            D: "Pauli-Z followed by Hadamard"
        },
        answer: "B"
    },
    {
        question: "Which gate sequence transforms |+> into |1>?",
        options: {
            A: "Hadamard then Pauli-X",
            B: "Hadamard", 
            C: "Pauli-Z then Hadamard",
            D: "Hadamard then Pauli-Z"
        },
        answer: "B"
    }
];

// --- GAME FUNCTIONS ---

// Function to start the countdown timer
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // Disable interaction when time is up
            optionButtons.forEach(button => button.disabled = true);
            // Show final score with 'Time up' message
            showFinalScore("Time Up!");
        }
    }, 1000);
}

// Function to show the final score modal
function showFinalScore(statusMessage) {
    // Stop the timer if it's still running
    clearInterval(timerInterval);
    
    modalTitleElement.textContent = statusMessage;
    finalScoreElement.textContent = score;
    quizModal.style.display = 'block';
}

// Function to display the current question
function loadQuestion() {
    if (currentQuestionIndex >= quizData.length) {
        // All questions answered, end the quiz
        showFinalScore("Quiz Finished!");
        return;
    }

    const currentQ = quizData[currentQuestionIndex];
    
    // Clear previous highlighting and re-enable buttons
    optionButtons.forEach(button => {
        button.className = 'option-button';
        button.disabled = false;
    });
    isAnswerLocked = false;

    // Display question text (will be processed by MathJax)
    questionTextElement.innerHTML = currentQ.question;
    
    // Display options (will be processed by MathJax)
    optionButtons.forEach(button => {
        const optionKey = button.getAttribute('data-option');
        // Prefix with the option letter for clarity, then the option content
        button.innerHTML = `${optionKey}. ${currentQ.options[optionKey]}`;
    });

    // Rerender MathJax to process the new LaTeX content
    if (typeof MathJax !== 'undefined') {
        // Use a slight delay to ensure the DOM updates have settled before typesetting
        setTimeout(() => {
            MathJax.typesetPromise([document.getElementById('question-container'), document.getElementById('options-grid')]);
        }, 50);
    }
}

// Function to check the answer
function checkAnswer(selectedOption) {
    // Prevent answering if already locked or time is up
    if (isAnswerLocked || timeLeft <= 0) return; 
    isAnswerLocked = true;

    const currentQ = quizData[currentQuestionIndex];
    const selectedButton = document.querySelector(`.option-button[data-option="${selectedOption}"]`);
    const correctAnswer = currentQ.answer;

    // Disable all buttons to prevent double-clicking
    optionButtons.forEach(button => button.disabled = true);

    if (selectedOption === correctAnswer) {
        // Correct Answer
        selectedButton.classList.add('correct');
        score += 5;
    } else {
        // Incorrect Answer
        selectedButton.classList.add('incorrect');
        // Highlight the correct answer
        document.querySelector(`.option-button[data-option="${correctAnswer}"]`).classList.add('correct');
        score -= 1;
    }

    // Update the score display
    scoreElement.textContent = score;

    // Move to the next question after a brief pause, but only if time hasn't run out
    setTimeout(() => {
        if (timeLeft > 0) {
            currentQuestionIndex++;
            loadQuestion();
        }
    }, 1500);
}

// Event listener setup is done after all elements are guaranteed to exist (due to window.onload or defer in HTML)
window.onload = () => {
    // Add event listeners to the option buttons
    optionButtons.forEach(button => {
        button.addEventListener('click', () => {
            checkAnswer(button.getAttribute('data-option'));
        });
    });
    
    // Start the quiz and the timer
    loadQuestion();
    startTimer();
};