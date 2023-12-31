import * as types from "../utils/test.types"
import { updateCursor } from "./cursor"
import { startTimer, updateCounter } from "../stats/counter"
import { currentTest } from "../index"
import { sendResults, showResults } from "./results"

let activeChar: HTMLElement | null

export function listenInput() {
    const inputField = document.querySelector("#test-input") as HTMLInputElement
    const testContainer = document.querySelector("#test")

    function inputListener(e: Event) {
        if (currentTest.testStats.state == "completed" || currentTest.testStats.state == "cancelled") {
            return
        }
        if (currentTest.testStats.state === "inactive") {
            activeChar = (document.querySelector("#words") as HTMLElement).firstChild?.firstChild as HTMLElement
            startTest(currentTest.testStats)
        }

        const inputType = (e as InputEvent).inputType
        const data = (e as InputEvent).data

        currentTest.testStats.inputStats.updateInputCounts(updateActiveChar(data, inputType));
        updateWordState(activeChar as HTMLElement) 
        currentTest.testStats.inputStats.updateStats(activeChar as HTMLElement)
        updateCursor(activeChar as HTMLElement)
        currentTest.testStats.updateAccuracy()
        updateHTMLAccuracy(currentTest.testStats)

        if (currentTest.testStats.words) {
            updateCounter()
            if (currentTest.testStats.inputStats.wordCount == currentTest.testStats.words) {
                completeTest(currentTest.testStats)
            }
        }
        inputField.value = " ";
    }

    [document.querySelector("#test-menu"), document.querySelector(".test-reset")].forEach(element => {
        element?.addEventListener("mousedown", function(e) {
            e.preventDefault()
        })
    })

    inputField.addEventListener("input", inputListener)

    testContainer?.addEventListener("focusin", function(e){
        e.preventDefault
        inputField.focus()
    })

    inputField.addEventListener("focusin", function() {
        testContainer?.classList.remove("inactive")
    })
    inputField.addEventListener("focusout", function() {
        testContainer?.classList.add("inactive")
    })
}

function checkForbiddenInput(inputType: string): boolean {
    const allowedInputs = ["insertText", "deleteContentBackward"]
    if (!allowedInputs.includes(inputType)) return true
    return false
}

function checkWordStart(): boolean {
    return !activeChar?.previousElementSibling
}

function checkWordEnd(): boolean {
    return !activeChar?.nextElementSibling
}

function setNextWord() {
    if (activeChar?.parentElement?.nextElementSibling?.matches(".word")) {
        activeChar = activeChar?.parentElement?.nextElementSibling?.firstChild as HTMLElement
        currentTest.testStats.inputStats.wordCount++
    }
    else if (currentTest.testStats.words) {
        currentTest.testStats.inputStats.wordCount++
    }
}

function setPreviousWord() {
    if (activeChar?.parentElement?.previousElementSibling) {
        const previousWordChar = Array.from(activeChar.parentElement?.previousElementSibling?.querySelectorAll('.correct, .incorrect')).pop()
        if (previousWordChar) activeChar = previousWordChar as HTMLElement
        if (activeChar.nextElementSibling) activeChar = activeChar.nextElementSibling as HTMLElement
        currentTest.testStats.inputStats.wordCount--
    }
}

function setNextChar() {
    if (activeChar?.nextElementSibling) {
        activeChar = activeChar.nextElementSibling as HTMLElement
        return
    }

    if (!activeChar?.parentElement?.nextElementSibling?.matches(".word") && currentTest.testStats.words) {
        currentTest.testStats.inputStats.wordCount++
    }
}

function setPreviousChar() {
    if (checkWordStart()) {
        setPreviousWord()
        return
    }
    activeChar = activeChar?.previousElementSibling as HTMLElement
}

function addExtraChar(data: string) {
    const extraChar = document.createElement("span")
    extraChar.classList.add("letter", "extra", "incorrect")
    extraChar.innerText = data as string
    activeChar?.parentElement?.appendChild(extraChar)
    setNextChar()
}

function deleteExtraChar() {
    setPreviousChar()
    const nextElement = activeChar?.nextElementSibling
    if (nextElement && nextElement.matches(".extra")) {
        nextElement.remove()
    }
}

function updateActiveChar(data: string | null, inputType: string): string {
    let returnValue = "invalid"

    if (checkForbiddenInput(inputType)) {
        return returnValue
    }

    if (inputType == "deleteContentBackward") {
        returnValue = "backspace"
        if (!(checkWordEnd() && activeChar?.matches(".correct, .incorrect"))) {
            setPreviousChar()
            if (checkWordEnd()) return returnValue
        }
        if (activeChar?.matches(".extra")) {
            deleteExtraChar()
            return returnValue
        }
        activeChar?.classList.remove("correct", "incorrect")
        return returnValue
    }

    if (data == " ") {
        if (!checkWordStart() || (activeChar?.parentElement?.innerText.length == 1 && activeChar.matches(".correct, .incorrect"))) {
            returnValue = "correct"
            if (!(checkWordEnd() && activeChar?.matches(".correct, .incorrect"))) returnValue = "incorrect"
            setNextWord()
        }
        return returnValue
    }

    if (data == activeChar?.innerHTML && !activeChar?.matches(".correct, .incorrect")) {
        activeChar?.classList.add("correct")
        returnValue = "correct"
    }
    else {
        returnValue = "incorrect"
        if (checkWordEnd() && activeChar?.matches(".correct, .incorrect")) {
            addExtraChar(data as string)
            return returnValue
        }
        activeChar?.classList.add("incorrect")
    }

    setNextChar()
    return returnValue
}

function updateWordState(char: HTMLElement) {
    if (checkWordEnd() && char.matches(".correct, .incorrect")) {
        getFullWordState(char.parentElement as HTMLElement)
    }
    else if (checkWordStart() && char.parentElement?.previousElementSibling) {
        getFullWordState(char.parentElement?.previousElementSibling as HTMLElement)
    }
    else getPartialWordState(char.parentElement as HTMLElement)
}

function getFullWordState(word: HTMLElement) {
    const wordChars = word.children
    const wordLen = wordChars.length
    let incorrectWordsCorrectCharsCount = 0

    for (let i = 0; i < wordLen; i++) {
        if (wordChars[i].matches(".correct")) {
            incorrectWordsCorrectCharsCount++
        }
    }
    if (incorrectWordsCorrectCharsCount !== wordLen) {
        word.classList.add("incorrectWord")
    }
    else {
        word.classList.remove("incorrectWord")
    }
}

function getPartialWordState(word: HTMLElement) {
    const wordChars = word.children
    const wordLen = wordChars.length
    let check = true

    for (let i = 0; i < wordLen; i++) {
        if (wordChars[i].matches(".incorrect")) {
            word.classList.add("incorrectWord")
            check = false
        }
    }

    if (check) {
        word.classList.remove("incorrectWord")
    }
}

function updateHTMLAccuracy(object: types.testStats) {
    (document.querySelector("#live-stats > .accuracy > span.value") as HTMLElement).innerText = `${Math.round(object.accuracy * 100)}%`;
}

function updateHTMLWpm(object: types.testStats) {
    (document.querySelector("#live-stats > .wpm > span.value") as HTMLElement).innerText = `${Math.round(object.wpm)}`;
//    (document.querySelector("#live-stats > .raw-wpm > span.value") as HTMLElement).innerText = `${Math.round(object.rawWpm)}`;
}

function startTest(object: types.testStats) {
    object.state = "active"
    object.inputStats.startTime = Date.now()
    document.querySelector("#test-info")?.classList.add("active")
    startTimer()
}

export function completeTest(object: types.testStats) {
    activeChar = null;

    if (object.inputStats.timerID) {
        clearInterval(object.inputStats.timerID)
        object.inputStats.timerID = undefined
    }

    if (object.time) {
        object.inputStats.endTime = ((object.time * 1000) + object.inputStats.startTime)
    }
    else object.inputStats.endTime = Date.now()

    object.updateAccuracy()
    object.updateWpm()
    object.state = "completed"

    // Async function
    sendResults(object)

    showResults(object)
}

export function cancelTest(object: types.testStats) {
    activeChar = null;

    if (object.state == "active") {
        if (object.inputStats.timerID) {
            clearInterval(object.inputStats.timerID)
            object.inputStats.timerID = undefined
        }

        object.inputStats.endTime = Date.now()
        object.updateAccuracy()
        object.updateWpm()
        object.state = "cancelled"
        document.querySelector("#test-info")?.classList.remove("active")
        // Async function
        sendResults(object)
    }
}

export function updateStatsTimer(object: types.testStats) {
    object.inputStats.updateStats(activeChar as HTMLElement)
    object.updateWpm()
    updateHTMLWpm(object)
}