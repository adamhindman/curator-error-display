document.addEventListener("DOMContentLoaded", () => {
  const table = document.querySelector("table");
  const errorsListDiv = document.getElementById("errors-list");
  let errorMessagesUl;
  let currentlySpotlightedCell = null;
  let currentErrorGlowCell = null; // For persistent red glow

  // Button references
  const prevErrorBtn = document.getElementById("prev-error-btn");
  const nextErrorBtn = document.getElementById("next-error-btn");
  const addErrorBtn = document.getElementById("add-error-btn");
  const toggleErrorsBtn = document.getElementById(
    "toggle-errors-visibility-btn",
  );
  const focusedErrorMsgDiv = document.getElementById("focused-error-msg"); // NEW
  let currentDisplayingErrorId = null; // NEW: Tracks ID of error message in focusedErrorMsgDiv

  let currentErrorIndex = -1; // For Next/Prev error navigation

  // Initialize errorMessagesUl
  if (errorsListDiv) {
    errorMessagesUl = errorsListDiv.querySelector(":scope > ul");
    if (!errorMessagesUl) {
      errorMessagesUl = document.createElement("ul");
      errorsListDiv.appendChild(errorMessagesUl);
    }
  } else {
    console.error(
      "#errors-list div not found. Error messages and critical UI will not function.",
    );
    errorMessagesUl = document.createElement("ul"); // Dummy for resilience
    if (prevErrorBtn) prevErrorBtn.disabled = true;
    if (nextErrorBtn) nextErrorBtn.disabled = true;
    if (toggleErrorsBtn) toggleErrorsBtn.style.display = "none";
    if (focusedErrorMsgDiv) focusedErrorMsgDiv.innerHTML = ""; // Clear if container missing
  }

  // Event listener for the Expand/Collapse button
  if (toggleErrorsBtn && errorMessagesUl) {
    toggleErrorsBtn.addEventListener("click", () => {
      const isNowCollapsed = errorMessagesUl.classList.toggle(
        "errors-ul-collapsed",
      );
      toggleErrorsBtn.textContent = isNowCollapsed ? "Expand" : "Collapse";
    });
  }

  function getColumnName(columnIndex) {
    if (table && table.tHead && table.tHead.rows.length > 0) {
      const headerCell = table.tHead.rows[0].cells[columnIndex];
      if (!headerCell) return `Column ${columnIndex + 1}`;
      const clone = headerCell.cloneNode(true);
      clone.querySelectorAll(".sort-icon").forEach((el) => el.remove());
      return clone.textContent.trim();
    }
    return `Column ${columnIndex + 1}`;
  }

  function getDisplayRowNumber(cell) {
    const tBody = cell.closest("tbody");
    if (tBody) {
      const rowsInTBody = Array.from(tBody.rows);
      const rowIndexInTBody = rowsInTBody.indexOf(cell.parentElement);
      return rowIndexInTBody + 1;
    }
    return cell.parentElement.rowIndex + 1; // Fallback
  }

  function activateCellEditing(cell) {
    if (
      !cell ||
      cell.closest("thead") ||
      cell.querySelector("input.editable-cell-input")
    ) {
      return; // Already editing or not an editable cell
    }

    // Remove temporary YELLOW spotlight as cell enters edit mode.
    if (cell.classList.contains("spotlighted")) {
      cell.classList.remove("spotlighted");
      if (currentlySpotlightedCell === cell) {
        currentlySpotlightedCell = null;
      }
    }

    const originalContentHTML = cell.innerHTML;
    const originalText = cell.textContent;
    const originalCellInlinePosition = cell.style.position;
    const cellComputedPosition = window.getComputedStyle(cell).position;
    if (cellComputedPosition === "static") {
      cell.style.position = "relative";
    }

    const input = document.createElement("input");
    input.type = "text";
    input.value = originalText;
    input.className = "editable-cell-input";

    // --- Listener for input focus to update #focused-error-msg ---
    input.addEventListener("focus", () => {
      if (focusedErrorMsgDiv) {
        const errorIdForThisCell = `error-row${cell.parentElement.rowIndex}-col${cell.cellIndex}`;
        if (cell.classList.contains("error")) {
          const errorLi = document.getElementById(errorIdForThisCell);
          if (errorLi) {
            const errorLink = errorLi.querySelector("a");
            if (errorLink) {
              focusedErrorMsgDiv.innerHTML = errorLink.innerHTML;
              currentDisplayingErrorId = errorIdForThisCell;
            }
          } else {
            // Cell has .error class, but no corresponding error item in the list.
            focusedErrorMsgDiv.innerHTML = ""; // Or a generic message like "Error detected"
            currentDisplayingErrorId = null;
          }

          // Manage red glow for the parent cell as it's an error cell being edited.
          if (currentErrorGlowCell && currentErrorGlowCell !== cell) {
            currentErrorGlowCell.classList.remove("current-error-glow");
          }
          if (!cell.classList.contains("current-error-glow")) {
            cell.classList.add("current-error-glow");
          }
          currentErrorGlowCell = cell;
        } else {
          // Parent cell of focused input is NOT an error cell
          // If a message for a different error was displayed, clear it.
          if (
            currentDisplayingErrorId &&
            currentDisplayingErrorId !== errorIdForThisCell
          ) {
            focusedErrorMsgDiv.innerHTML = "";
            currentDisplayingErrorId = null;
          }
          // If this cell was the one with the glow (e.g. error just fixed), remove glow.
          if (cell === currentErrorGlowCell) {
            cell.classList.remove("current-error-glow");
            currentErrorGlowCell = null;
            // And if its (now obsolete) message was displayed, ensure it's cleared
            if (currentDisplayingErrorId === errorIdForThisCell) {
              focusedErrorMsgDiv.innerHTML = "";
              currentDisplayingErrorId = null;
            }
          }
        }
      }
    });
    // --- End of input focus listener ---

    const handleFinishEditing = (save) => {
      let validationResult;
      if (input.parentNode === cell) {
        if (save) {
          cell.textContent = input.value;
          validationResult = validateCellContent(cell, cell.textContent);
        } else {
          cell.innerHTML = originalContentHTML;
          validationResult = validateCellContent(cell, originalText); // Re-validate with original
        }
        updateErrorDisplay(cell, validationResult);
      }
      if (cellComputedPosition === "static") {
        if (originalCellInlinePosition) {
          cell.style.position = originalCellInlinePosition;
        } else {
          cell.style.removeProperty("position");
        }
      }
    };

    const blurHandler = () => {
      setTimeout(() => {
        if (cell.contains(input) && document.activeElement !== input) {
          handleFinishEditing(true);
        }
      }, 0);
    };

    const keydownHandler = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleFinishEditing(true);
        if (input.parentNode) input.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleFinishEditing(false);
        if (input.parentNode) input.blur();
      }
    };

    input.addEventListener("blur", blurHandler);
    input.addEventListener("keydown", keydownHandler);

    cell.innerHTML = "";
    cell.appendChild(input);
    input.focus(); // This will trigger the input's own focus listener.
    input.select();
  }

  function updateErrorListState() {
    const errorCountDisplay = document.getElementById("error-count-display");

    if (!errorsListDiv) {
      if (prevErrorBtn) prevErrorBtn.disabled = true;
      if (nextErrorBtn) nextErrorBtn.disabled = true;
      if (errorCountDisplay) errorCountDisplay.textContent = "No errors.";
      if (toggleErrorsBtn) toggleErrorsBtn.style.display = "none";
      if (focusedErrorMsgDiv) focusedErrorMsgDiv.innerHTML = "";
      currentDisplayingErrorId = null;
      return;
    }

    const errorCount =
      errorMessagesUl && errorMessagesUl.isConnected
        ? errorMessagesUl.querySelectorAll("li").length
        : 0;

    if (errorCount === 0) {
      errorsListDiv.style.display = "none"; // Hide if no errors

      errorsListDiv.classList.remove("errors-list-is-sticky");
      errorsListDiv.classList.add("no-errors");
      errorsListDiv.classList.remove("has-errors");

      if (errorMessagesUl) {
        errorMessagesUl.classList.add("errors-ul-collapsed");
        delete errorMessagesUl.dataset.collapseStateInitialized;
      }
      if (toggleErrorsBtn) {
        toggleErrorsBtn.textContent = "Expand";
        // CSS rule #errors-list.no-errors #toggle-errors-visibility-btn will hide it
      }
      if (errorCountDisplay) errorCountDisplay.textContent = "No errors.";
      if (prevErrorBtn) prevErrorBtn.disabled = true;
      if (nextErrorBtn) nextErrorBtn.disabled = true;

      if (currentErrorGlowCell) {
        currentErrorGlowCell.classList.remove("current-error-glow");
        currentErrorGlowCell = null;
      }
      if (focusedErrorMsgDiv) {
        focusedErrorMsgDiv.innerHTML = "";
        currentDisplayingErrorId = null;
      }
      currentErrorIndex = -1;
    } else {
      // Errors exist
      errorsListDiv.style.display = ""; // Show the list
      errorsListDiv.classList.add("errors-list-is-sticky");
      errorsListDiv.classList.remove("no-errors");
      errorsListDiv.classList.add("has-errors");

      if (toggleErrorsBtn) {
        toggleErrorsBtn.style.display = ""; // Ensure visible if not hidden by specific CSS
      }

      if (errorMessagesUl) {
        if (!errorMessagesUl.dataset.collapseStateInitialized) {
          errorMessagesUl.classList.add("errors-ul-collapsed"); // Default to collapsed
          if (toggleErrorsBtn) toggleErrorsBtn.textContent = "Expand";
          errorMessagesUl.dataset.collapseStateInitialized = "true";
        } else {
          // Reflect current state on the button if already initialized
          if (toggleErrorsBtn) {
            toggleErrorsBtn.textContent = errorMessagesUl.classList.contains(
              "errors-ul-collapsed",
            )
              ? "Expand"
              : "Collapse";
          }
        }
        // If UL becomes empty but errorCount > 0 (e.g. intermediate state), ensure it's collapsed
        if (
          errorMessagesUl.children.length === 0 &&
          !errorMessagesUl.classList.contains("errors-ul-collapsed")
        ) {
          errorMessagesUl.classList.add("errors-ul-collapsed");
          if (toggleErrorsBtn) toggleErrorsBtn.textContent = "Expand";
        }
      }

      if (errorCountDisplay) {
        errorCountDisplay.textContent =
          errorCount === 1 ? "1" : `${errorCount}`;
      }
      if (prevErrorBtn) prevErrorBtn.disabled = false;
      if (nextErrorBtn) nextErrorBtn.disabled = false;

      if (currentErrorIndex === -1) {
        // If errors just appeared
        currentErrorIndex = 0;
      }
    }
  }

  function navigateToErrorByIndex(index) {
    if (!errorMessagesUl) return;
    const errorLinks = errorMessagesUl.querySelectorAll("li > a");
    if (index >= 0 && index < errorLinks.length) {
      errorLinks[index].click(); // This click triggers the full navigation sequence
    }
  }

  function updateErrorDisplay(cell, validationResult) {
    if (!errorsListDiv || !errorMessagesUl || !errorMessagesUl.isConnected) {
      updateErrorListState();
      return;
    }

    const cellRowIndexForId = cell.parentElement.rowIndex;
    const colIndexForId = cell.cellIndex;
    const errorId = `error-row${cellRowIndexForId}-col${colIndexForId}`;
    const existingErrorLi = document.getElementById(errorId);

    if (!validationResult.isValid) {
      const displayRowNumber = getDisplayRowNumber(cell);
      const columnName = getColumnName(
        validationResult.columnIndex !== undefined
          ? validationResult.columnIndex
          : cell.cellIndex,
      );
      const formattedErrorMessageHTML =
        `<span class="error-column-name">${columnName}</span> ` +
        `<span class="error-message-text">${validationResult.message}</span> ` +
        `<span class="error-row-number">(Row ${displayRowNumber})</span>`;

      if (existingErrorLi) {
        existingErrorLi.querySelector("a").innerHTML =
          formattedErrorMessageHTML;
      } else {
        const li = document.createElement("li");
        li.id = errorId;
        const a = document.createElement("a");
        a.href = "#";
        a.dataset.targetRowIndex = cell.parentElement.rowIndex;
        a.dataset.targetColIndex = cell.cellIndex;
        a.innerHTML = formattedErrorMessageHTML;

        a.addEventListener("click", (e) => {
          e.preventDefault();
          const targetRowIdx = parseInt(
            e.currentTarget.dataset.targetRowIndex,
            10,
          );
          const targetColIdx = parseInt(
            e.currentTarget.dataset.targetColIndex,
            10,
          );
          const targetCellFromLink =
            table.rows[targetRowIdx]?.cells[targetColIdx];

          if (targetCellFromLink) {
            // Collapse error list
            if (
              errorMessagesUl &&
              !errorMessagesUl.classList.contains("errors-ul-collapsed") &&
              toggleErrorsBtn
            ) {
              errorMessagesUl.classList.add("errors-ul-collapsed");
              toggleErrorsBtn.textContent = "Expand";
            }
            // Manage temporary yellow spotlight
            if (
              currentlySpotlightedCell &&
              currentlySpotlightedCell !== targetCellFromLink
            ) {
              currentlySpotlightedCell.classList.remove("spotlighted");
            }
            targetCellFromLink.classList.add("spotlighted");
            currentlySpotlightedCell = targetCellFromLink;
            // Manage persistent red glow - this sets the *target* for the glow
            if (
              currentErrorGlowCell &&
              currentErrorGlowCell !== targetCellFromLink
            ) {
              currentErrorGlowCell.classList.remove("current-error-glow");
            }
            targetCellFromLink.classList.add("current-error-glow");
            currentErrorGlowCell = targetCellFromLink;
            // Scroll to cell
            targetCellFromLink.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
            // Activate editing (this will trigger the input's focus listener, updating #focused-error-msg)
            activateCellEditing(targetCellFromLink);

            const allErrorLIs = Array.from(
              errorMessagesUl.querySelectorAll("li"),
            );
            const clickedLi = e.currentTarget.closest("li");
            currentErrorIndex = allErrorLIs.indexOf(clickedLi);
          }
        });
        li.appendChild(a);
        errorMessagesUl.appendChild(li);
      }
    } else {
      // Is valid
      if (existingErrorLi) {
        const currentErrorIdBeingRemoved = existingErrorLi.id;
        const allLIsBeforeRemoval = Array.from(
          errorMessagesUl.querySelectorAll("li"),
        );
        const removedLiIndex = allLIsBeforeRemoval.indexOf(existingErrorLi);
        errorMessagesUl.removeChild(existingErrorLi);

        if (currentErrorIndex === removedLiIndex) {
          const newErrorCountAfterRemoval =
            errorMessagesUl.querySelectorAll("li").length;
          if (newErrorCountAfterRemoval === 0) {
            currentErrorIndex = -1;
          } else if (currentErrorIndex >= newErrorCountAfterRemoval) {
            currentErrorIndex = newErrorCountAfterRemoval - 1;
          }
        } else if (
          removedLiIndex !== -1 &&
          removedLiIndex < currentErrorIndex
        ) {
          currentErrorIndex--;
        }

        if (cell === currentErrorGlowCell) {
          cell.classList.remove("current-error-glow");
          currentErrorGlowCell = null;
        }
        if (
          focusedErrorMsgDiv &&
          currentErrorIdBeingRemoved === currentDisplayingErrorId
        ) {
          focusedErrorMsgDiv.innerHTML = "";
          currentDisplayingErrorId = null;
        }
        if (currentlySpotlightedCell === cell) {
          currentlySpotlightedCell.classList.remove("spotlighted");
          currentlySpotlightedCell = null;
        }
      }
    }
    updateErrorListState();
  }

  function validateCellContent(cell, valueToValidate) {
    const columnIndex = cell.cellIndex;
    // 0: Patient ID, 1: Specimen ID, 2: Parent ID, 3: Platform,
    // 4: Tumor Type, 5: Disease, 6: Species, 7: Specimen Preparation Method
    const numericColumns = [0, 2]; // Patient ID, Parent ID
    const tumorTypeColumn = 4;
    const validTumorTypes = ["benign", "malignant"];
    let isValid = true;
    let message = "";
    const valueStr = String(valueToValidate).trim();

    if (valueStr === "") {
      isValid = false;
      message = "Value cannot be empty.";
    } else if (numericColumns.includes(columnIndex)) {
      if (!/^\d+$/.test(valueStr)) {
        isValid = false;
        message = "Must be a number.";
      }
    } else if (columnIndex === tumorTypeColumn) {
      if (!validTumorTypes.includes(valueStr.toLowerCase())) {
        isValid = false;
        message = `Must be one of: ${validTumorTypes.map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(", ")}.`;
      }
    }

    if (isValid) cell.classList.remove("error");
    else cell.classList.add("error");
    return { isValid, message, value: valueStr, columnIndex };
  }

  // Event listeners for data cells
  const dataCells = table.querySelectorAll("tbody td");
  dataCells.forEach((cell) => {
    cell.tabIndex = 0; // For keyboard focus
    cell.addEventListener("focus", () => {
      // On manual focus of a TD, remove any error navigation spotlight
      if (cell.classList.contains("spotlighted")) {
        cell.classList.remove("spotlighted");
        if (currentlySpotlightedCell === cell) currentlySpotlightedCell = null;
      }
      cell.classList.add("cell-focused"); // General focus indicator for TD

      // Auto-collapse errors list if user manually focuses a cell & list is expanded
      if (
        errorMessagesUl &&
        !errorMessagesUl.classList.contains("errors-ul-collapsed") &&
        toggleErrorsBtn
      ) {
        errorMessagesUl.classList.add("errors-ul-collapsed");
        toggleErrorsBtn.textContent = "Expand";
      }

      // Clear focusedErrorMsgDiv if user manually focuses a TD that is NOT the current red-glowing error cell
      // If they then click to edit, activateCellEditing will show the message if that cell IS an error cell.
      if (focusedErrorMsgDiv && cell !== currentErrorGlowCell) {
        focusedErrorMsgDiv.innerHTML = "";
        currentDisplayingErrorId = null;
      }
    });
    cell.addEventListener("blur", () => cell.classList.remove("cell-focused"));
    cell.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" &&
        !cell.querySelector("input.editable-cell-input")
      ) {
        event.preventDefault();
        activateCellEditing(cell);
      }
    });
    // Initial validation scan for pre-existing data
    const validationResult = validateCellContent(cell, cell.textContent);
    updateErrorDisplay(cell, validationResult);
  });

  function addOneRandomError() {
    const candidateColumnIndices = [0, 2, 4]; // Patient ID, Parent ID, Tumor Type
    const candidateCells = [];
    table.querySelectorAll("tbody tr").forEach((row) => {
      candidateColumnIndices.forEach((colIndex) => {
        if (row.cells[colIndex]) candidateCells.push(row.cells[colIndex]);
      });
    });
    if (candidateCells.length === 0) {
      console.warn("No candidate cells for adding random error.");
      return;
    }
    const randomCellIndex = Math.floor(Math.random() * candidateCells.length);
    const cellToCorrupt = candidateCells[randomCellIndex];
    const invalidValues = ["abc", "", "xyz123", "foo", "bad data", "---"];
    const randomInvalidValue =
      invalidValues[Math.floor(Math.random() * invalidValues.length)];
    cellToCorrupt.textContent = randomInvalidValue;
    const validationResult = validateCellContent(
      cellToCorrupt,
      cellToCorrupt.textContent,
    );
    updateErrorDisplay(cellToCorrupt, validationResult);
  }

  // Event listener for initiating cell editing by click
  table.addEventListener("click", function (event) {
    const cell = event.target.closest("td");
    if (
      cell &&
      !cell.closest("thead") &&
      !cell.querySelector("input.editable-cell-input")
    ) {
      activateCellEditing(cell);
    }
  });

  // Event listener for "Add an Error" button
  if (addErrorBtn) {
    addErrorBtn.addEventListener("click", () => {
      addOneRandomError();
    });
  }

  // Event listeners for Next/Previous Error buttons
  if (nextErrorBtn) {
    nextErrorBtn.addEventListener("click", () => {
      if (!errorMessagesUl) return;
      const errorLIs = errorMessagesUl.querySelectorAll("li");
      if (errorLIs.length === 0) return;
      currentErrorIndex++;
      if (currentErrorIndex >= errorLIs.length) currentErrorIndex = 0;
      navigateToErrorByIndex(currentErrorIndex);
    });
  }
  if (prevErrorBtn) {
    prevErrorBtn.addEventListener("click", () => {
      if (!errorMessagesUl) return;
      const errorLIs = errorMessagesUl.querySelectorAll("li");
      if (errorLIs.length === 0) return;
      currentErrorIndex--;
      if (currentErrorIndex < 0) currentErrorIndex = errorLIs.length - 1;
      navigateToErrorByIndex(currentErrorIndex);
    });
  }

  // Keyboard shortcuts for error navigation
  document.addEventListener("keydown", (event) => {
    if (event.metaKey) {
      // Cmd key
      if (event.key === "]") {
        // Cmd + ]
        if (nextErrorBtn && !nextErrorBtn.disabled) {
          event.preventDefault();
          nextErrorBtn.click();
        }
      } else if (event.key === "[") {
        // Cmd + [
        if (prevErrorBtn && !prevErrorBtn.disabled) {
          event.preventDefault();
          prevErrorBtn.click();
        }
      }
    }
  });

  updateErrorListState(); // Initial call to set up all states
});
