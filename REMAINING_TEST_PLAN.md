# Remaining Frontend Test Execution and Debugging Plan

This plan outlines the steps to execute and debug the frontend unit tests for the procurement module.

**Assumptions:**
- The current working directory for `run_in_bash_session` is `/app/itsm_frontend/`.
- `npm install --legacy-peer-deps --save-dev happy-dom` has been run successfully at least once in a session that persisted `package.json` and `package-lock.json` changes.

## 1. Execute and Debug IOM Tests

- **File:** `itsm_frontend/src/modules/procurement/components/purchase-request-memos/PurchaseRequestMemoForm.test.tsx`
- **Command:** `npm run test -- src/modules/procurement/components/purchase-request-memos/PurchaseRequestMemoForm.test.tsx`
- **Expected Outcome:** Tests should run. Analyze any failures.
- **Known Potential Issues & Debug Steps for IOM Tests:**
    - The tests were previously failing with issues related to the component rendering a loading/error state instead of the expected form, and `mockShowSnackbar` not being called. The `useParams` mocking and `UIContextProvider` import have been corrected. Additional `waitFor` calls for loading indicators were added.
    - If tests still fail, focus on:
        - **Async operations in `useEffect`:** Ensure all state updates triggered by async operations (dropdown loading, data fetching in edit mode) are correctly awaited using `waitFor` and that assertions check the final state.
        - **Mocking of `useParams`:** Double-check its effect if tests show unexpected `memoId` values.
        - **`act(...)` warnings:** These indicate state updates happening outside `waitFor` or `act()`. Wrap relevant code or improve `waitFor` conditions.
        - **Element selectors:** Ensure `getByLabelText`, `getByRole`, etc., are correctly finding elements post-async operations.

## 2. Re-create, Execute, and Debug PO Tests

- **Action:** The file `PurchaseOrderForm.test.tsx` had issues with extraneous characters from previous `create_file_with_block` attempts. It needs to be re-created cleanly.
- **File to create:** `itsm_frontend/src/modules/procurement/components/purchase-orders/PurchaseOrderForm.test.tsx`
- **Content:** Use the fully corrected content block (which includes fixes for specific element queries like title vs. button, item row field selectors, IOM option text, and `expect.any(Function)` for `authenticatedFetch` in mock calls).
- **Verification Command:** `ls -l src/modules/procurement/components/purchase-orders/PurchaseOrderForm.test.tsx`
- **Test Execution Command:** `npm run test -- src/modules/procurement/components/purchase-orders/PurchaseOrderForm.test.tsx`
- **Expected Outcome:** Tests should run. Analyze any failures.
- **Known Potential Issues & Debug Steps for PO Tests:**
    - **Element Selectors in Table:** The `getItemRowFields` helper needs to robustly find input fields within table rows. Ensure `getByRole` with `name` attribute works, or use `data-testid` as a more stable alternative if direct naming is problematic in the test DOM.
    - **Multiple Elements Found:** For assertions on text that might appear in multiple places (e.g., page title and button text), use more specific queries (e.g., `getByRole('heading', { name: /.../i })` or `within(getByRole('alert')).getByText(...)`).
    - **Invalid Item Validation Logic:** The test for invalid order items was previously showing a success state. This might indicate a bug in the component's validation logic for empty numeric fields that are treated as `0`. The test should assert the *expected* error behavior.
    - Similar to IOM tests, watch for `act(...)` warnings and ensure async operations are handled correctly with `waitFor`.

## 3. Re-create, Execute, and Debug CR Tests

- **Action:** Re-create the CR test file to ensure it's clean.
- **File to create:** `itsm_frontend/src/modules/procurement/components/check-requests/CheckRequestForm.test.tsx`
- **Content:** Use the previously established content for this file.
- **Verification Command:** `ls -l src/modules/procurement/components/check-requests/CheckRequestForm.test.tsx`
- **Test Execution Command:** `npm run test -- src/modules/procurement/components/check-requests/CheckRequestForm.test.tsx`
- **Expected Outcome:** Tests should run. Analyze any failures, likely focusing on similar async/waitFor and element selector issues if they arise.

## 4. Attempt to Run All Tests

- **Command:** `npm run test`
- **Expected Outcome:** All three test suites (IOM, PO, CR) should be discovered and run. Report overall pass/fail status.

## 5. Final Submission

- If all tests are made to pass (or failing tests are acknowledged as component bugs requiring separate fixes), submit all corrected test files and any necessary changes to component files (e.g., adding `data-testid` or `aria-label` attributes) to a new branch.
