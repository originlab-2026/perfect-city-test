/**
 * 工具函数库
 */

const StorageKeys = {
    QUIZ_DATA: 'quiz_data',
    USER_ANSWERS: 'user_answers',
    CURRENT_QUESTION: 'current_question',
    QUIZ_CONFIG: 'quiz_config',
    UI_CONFIG: 'ui_config',
    PAYMENT_ORDER_NUMBER: 'payment_order_number',
    PAYMENT_TIME: 'payment_time',
    USED_ORDER_NUMBERS: 'used_order_numbers'
};

const PERFECT_CITY_QUIZ_ID = 'perfect-city';
const PERFECT_CITY_QUIZ_NAME = '你最适合居住的城市';
const STORAGE_NAMESPACE = 'perfect_city_test';
const LEGACY_STORAGE_KEYS = new Set([
    StorageKeys.QUIZ_DATA,
    StorageKeys.USER_ANSWERS,
    StorageKeys.CURRENT_QUESTION,
    StorageKeys.QUIZ_CONFIG,
    StorageKeys.UI_CONFIG,
    StorageKeys.PAYMENT_ORDER_NUMBER,
    StorageKeys.PAYMENT_TIME,
    StorageKeys.USED_ORDER_NUMBERS,
    'question_option_order'
]);

function isPerfectCityQuizData(quizData) {
    if (!quizData || !quizData.scale_questions || !quizData.choice_questions) return false;
    if (quizData.quiz_id === PERFECT_CITY_QUIZ_ID) return true;
    if (!quizData.quiz_id && quizData.quiz_name === PERFECT_CITY_QUIZ_NAME) return true;
    return false;
}

function pruneUserAnswersForQuiz(answers, quizData) {
    if (!answers || typeof answers !== 'object' || !quizData) return {};
    const ids = new Set([
        ...(quizData.scale_questions || []).map(q => q.question_id),
        ...(quizData.choice_questions || []).map(q => q.question_id)
    ]);
    const pruned = {};
    Object.keys(answers).forEach((k) => {
        if (ids.has(k)) pruned[k] = answers[k];
    });
    return pruned;
}

class StorageUtil {
    static getScopedKey(key) {
        return `${STORAGE_NAMESPACE}:${String(key)}`;
    }

    static parseStoredValue(raw) {
        if (raw === null || raw === undefined) return null;
        if (raw === '') return '';
        try {
            return JSON.parse(raw);
        } catch (e) {
            return raw;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(this.getScopedKey(key), JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    }

    static get(key, defaultValue = null) {
        try {
            const scopedKey = this.getScopedKey(key);
            const scopedItem = localStorage.getItem(scopedKey);
            if (scopedItem !== null) {
                return this.parseStoredValue(scopedItem);
            }
            const legacyItem = localStorage.getItem(key);
            if (legacyItem !== null) {
                const parsed = this.parseStoredValue(legacyItem);
                try {
                    localStorage.setItem(scopedKey, JSON.stringify(parsed));
                } catch (e) { /* no-op */ }
                localStorage.removeItem(key);
                return parsed;
            }
            return defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    }

    static remove(key) {
        localStorage.removeItem(this.getScopedKey(key));
        localStorage.removeItem(key);
    }

    static clear() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key.startsWith(`${STORAGE_NAMESPACE}:`) || LEGACY_STORAGE_KEYS.has(key)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    static clearQuizProgress() {
        this.remove(StorageKeys.USER_ANSWERS);
        this.remove(StorageKeys.CURRENT_QUESTION);
        this.remove('question_option_order');
    }
}

class QuizValidator {
    static validate(quizData) {
        const errors = [];
        if (!quizData.quiz_name) errors.push('缺少测试名称 (quiz_name)');
        if (!quizData.nbr_question) errors.push('缺少题目数量 (nbr_question)');
        if (!quizData.dimensions || !Array.isArray(quizData.dimensions) || quizData.dimensions.length === 0) {
            errors.push('缺少维度定义表 (dimensions)');
        }
        if (!quizData.scale_questions || !Array.isArray(quizData.scale_questions)) {
            errors.push('缺少量表题数据表 (scale_questions)');
        }
        return { valid: errors.length === 0, errors };
    }
}

const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    formatPercent(value, decimals = 1) {
        return (value * 100).toFixed(decimals) + '%';
    }
};

const DefaultUIConfig = {
    theme: 'default',
    primaryColor: '#5654b8',
    secondaryColor: '#d8d7f0',
    backgroundColor: '#f5f4fb',
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    borderRadius: '12px',
    maxWidth: '800px'
};

function getUIConfig() {
    const customConfig = StorageUtil.get(StorageKeys.UI_CONFIG, {});
    return { ...DefaultUIConfig, ...customConfig };
}

function applyUIConfig(config = null) {
    const uiConfig = config || getUIConfig();
    const root = document.documentElement;
    root.style.setProperty('--primary-color', uiConfig.primaryColor);
    root.style.setProperty('--primary-dark', '#4543a0');
    root.style.setProperty('--primary-mid', '#7a78c9');
    root.style.setProperty('--secondary-color', uiConfig.secondaryColor);
    root.style.setProperty('--background-color', uiConfig.backgroundColor);
    root.style.setProperty('--font-family', uiConfig.fontFamily);
    root.style.setProperty('--border-radius', uiConfig.borderRadius);
    root.style.setProperty('--max-width', uiConfig.maxWidth);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StorageKeys, StorageUtil, QuizValidator, Utils, DefaultUIConfig,
        getUIConfig, applyUIConfig, PERFECT_CITY_QUIZ_ID, PERFECT_CITY_QUIZ_NAME,
        isPerfectCityQuizData, pruneUserAnswersForQuiz
    };
}
