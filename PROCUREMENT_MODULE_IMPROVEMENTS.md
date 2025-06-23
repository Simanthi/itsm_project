# Procurement Module Enhancement Plan

This document outlines suggestions for improving the procurement module (Internal Office Memos - IOM, Purchase Orders - PO, Check Requests - CR) of the ITSM software. This includes suggestions for new fields and broader ideas to elevate the module's capabilities.

## Part 1: New Field Suggestions

These fields aim to add more detail, improve tracking, and facilitate better financial control and reporting.

### 1. PurchaseRequestMemo (IOM)

*   **`iom_id` (CharField)**: *Implemented* - Unique, system-generated ID (e.g., IM-AA-0001).
*   **`department_id` (ForeignKey to Department model or CharField)**:
    *   **Purpose**: Assign the request to a specific department for budget tracking, approval routing, and reporting.
    *   **Considerations**: Requires a `Department` model or a predefined list of department codes.
*   **`project_id` (ForeignKey to Project model or CharField)**:
    *   **Purpose**: Link the request to a project for project-based costing and tracking.
    *   **Considerations**: Requires a `Project` model or a list of project codes.
*   **`priority` (CharField with choices: Low, Medium, High)**:
    *   **Purpose**: Allow requesters to indicate the urgency, helping approvers and procurement teams prioritize.
    *   **Default**: Medium.
*   **`required_delivery_date` (DateField)**:
    *   **Purpose**: Specify when the item/service is actually needed by, which can differ from the request date. Aids in planning and vendor communication.
*   **`suggested_vendor_id` (ForeignKey to Vendor model, nullable)**:
    *   **Purpose**: Allow requesters to suggest a preferred vendor, if known.
    *   **Considerations**: Procurement team would still vet and make the final vendor selection.
*   **`attachments` (FileField or a related model for multiple attachments)**:
    *   **Purpose**: Enable users to attach supporting documents like quotes, product specifications, images, etc.
    *   **Considerations**: Manage file storage and security.

### 2. PurchaseOrder (PO)

*   **`po_number` (CharField)**: *Existing, modified* - Now the unique, system-generated ID (e.g., PO-AA-0001).
*   **`payment_terms` (CharField, e.g., "Net 30", "Net 60", "Due on Receipt")**:
    *   **Purpose**: Define the agreed-upon payment terms with the vendor.
    *   **Considerations**: Could be a set of predefined choices or free text.
*   **`shipping_method` (CharField, e.g., "Courier", "Local Pickup", "Standard Mail")**:
    *   **Purpose**: Specify the method of shipping for goods.
*   **`billing_address` (TextField, nullable)**:
    *   **Purpose**: Specify the billing address if it's different from the organization's default or shipping address.
*   **`po_type` (CharField with choices, e.g., "Goods", "Services", "Subscription", "Framework Agreement")**:
    *   **Purpose**: Categorize POs for reporting and potentially different processing workflows.
*   **`related_contract_id` (CharField or ForeignKey to a Contract model, nullable)**:
    *   **Purpose**: Link the PO to an existing master agreement or contract with the vendor.
    *   **Considerations**: May require a basic `Contract` model or integration.
*   **`attachments` (FileField or related model for multiple attachments)**:
    *   **Purpose**: Store documents like the signed PO copy, detailed vendor quotation, terms and conditions specific to this PO.
*   **`revision_number` (PositiveIntegerField, default=0)**:
    *   **Purpose**: Track revisions to a PO. Each significant change could increment this.
    *   **Considerations**: Requires a mechanism to snapshot or log changes for a full audit trail (django-simple-history helps here).
*   **`currency` (CharField, default='USD')**:
    *   **Purpose**: Specify the currency of the PO, especially important for international vendors.
    *   **Considerations**: Integrate with currency conversion if multi-currency reporting is needed.

### 3. OrderItem (Line Items within PO)

*   **`product_code` (CharField, nullable)**:
    *   **Purpose**: Store the vendor's product code or an internal SKU for the item.
*   **`gl_account_id` (CharField or ForeignKey to GLAccount model)**:
    *   **Purpose**: Assign a General Ledger account code for expensing this line item, crucial for financial integration.
    *   **Considerations**: Requires a Chart of Accounts or `GLAccount` model.
*   **`received_quantity` (PositiveIntegerField, default=0)**:
    *   **Purpose**: Track how many units of this line item have been received.
    *   **Considerations**: Links to a future "Receiving" module/functionality.
*   **`line_item_status` (CharField with choices, e.g., "Pending", "Partially Received", "Fully Received", "Cancelled", "Invoiced")**:
    *   **Purpose**: Provide status at the line item level, as different items on a PO might have different fulfillment statuses.
*   **`tax_rate` (DecimalField, nullable)**:
    *   **Purpose**: Specify sales tax or VAT rate applicable to this line item.
*   **`discount_percentage_or_amount` (DecimalField, nullable)**:
    *   **Purpose**: Record any discounts applied to this specific line item.

### 4. CheckRequest (CR)

*   **`cr_id` (CharField)**: *Implemented* - Unique, system-generated ID (e.g., CR-AA-0001).
*   **`expense_category_id` (ForeignKey to an ExpenseCategory model or CharField)**:
    *   **Purpose**: Categorize the expense for better financial analysis and reporting (e.g., "Office Supplies", "Software Licenses", "Travel").
    *   **Considerations**: Requires an `ExpenseCategory` model or predefined list.
*   **`is_urgent` (BooleanField, default=False)**:
    *   **Purpose**: Flag if the payment needs to be expedited, potentially triggering a faster approval/payment process.
*   **`recurring_payment_id` (ForeignKey to a RecurringPayment setup, nullable)**:
    *   **Purpose**: Link this check request to a recurring payment schedule if it's part of one (e.g., monthly software subscription).
    *   **Considerations**: Requires a `RecurringPayment` model.
*   **`attachments` (FileField or related model for multiple attachments)**:
    *   **Purpose**: Attach supporting documents like the vendor invoice, receipts, or payment confirmations.
*   **`currency` (CharField, default='USD')**: (Similar to PO)
    *   **Purpose**: Specify the currency of the payment.

## Part 2: Ideas for Making the Module World-Class

To elevate this ITSM software's procurement module to a world-class standard, consider these broader enhancements:

1.  **Advanced Workflow & Approval Automation**:
    *   **Dynamic Approval Chains**: *Partially Implemented for IOMs.* System now supports rule-based generation of sequential approval steps for Purchase Request Memos (IOMs) based on IOM amount, department, and project. Configuration of rules is possible via Django Admin. Further enhancements could include workflows for other document types (POs, CRs) and more complex rule conditions.
    *   **Role-Based Approvals**: *Implemented for IOM Approval Steps.* Approval rules can assign steps to specific Django Groups (roles), and any member of that group can action the step.
    *   **Out-of-Office Delegation**: *Basic Model Implemented.* An `ApprovalDelegation` model has been added to capture delegation details (delegator, delegatee, period, reason). However, the logic to automatically apply these delegations within the approval workflow (e.g., re-assigning steps) is not yet implemented and is a future enhancement.
    *   **Parallel Approvals**: *Future Enhancement.* Current implementation focuses on sequential steps based on rule order.
    *   **Escalation Rules**: *Future Enhancement.*

2.  **Comprehensive Vendor Management**:
    *   **Vendor Portal**: A secure portal for vendors to view POs, submit invoices, update their contact/banking information, and track payment statuses.
    *   **Vendor Onboarding & Vetting**: Workflow for onboarding new vendors, including document collection (tax forms, compliance certs) and internal approvals.
    *   **Vendor Performance Tracking**: Rate vendors based on delivery times, quality, pricing, and responsiveness.
    *   **Contract Repository**: Store and manage vendor contracts, link them to POs, and set reminders for renewals.

3.  **Budgeting & Spend Control**:
    *   **Budget Definition**: Allow creation of budgets by department, project, or expense category for fiscal periods.
    *   **Pre-Purchase Budget Check**: Automatically check IOM/PO amounts against available budgets before submission or approval.
    *   **Spend Analytics**: Dashboards showing actual spend vs. budget, spend by vendor, category, etc.
    *   **Commitment Accounting**: Track committed funds (from approved POs) that are not yet invoiced/paid.

4.  **Goods & Services Receiving (GR/SR)**:
    *   **Line Item Receiving**: Functionality to record the receipt of goods or confirmation of service delivery against PO line items.
    *   **Partial Receipts**: Support for recording partial deliveries.
    *   **Quality Inspection**: Optional step for quality checks before formally accepting goods.
    *   **Integration with Asset Management**: Automatically create or update asset records upon receipt of asset-tagged items.

5.  **Three-Way Invoice Matching**:
    *   **Automated Matching**: Systematically match vendor invoices against POs and Goods Receipt Notes (GRNs).
    *   **Discrepancy Management**: Workflow to handle discrepancies in quantity, price, or terms.
    *   **Automated CR Creation**: Option to auto-generate a Check Request draft upon successful 3-way match.

6.  **Enhanced Reporting & Analytics**:
    *   **Customizable Reports**: Allow users to build and save custom reports with various filters and data points.
    *   **Procurement Dashboards**: Visual dashboards for KPIs like cycle times (requisition-to-pay), spend under management, vendor performance, savings achieved.
    *   **Predictive Analytics**: (Future-looking) Forecast future spend based on historical data.

7.  **Integration Capabilities**:
    *   **Accounting Systems**: Seamless integration (API or file-based) with popular accounting software (e.g., QuickBooks, Xero, SAP, Oracle).
    *   **ERP Systems**: Deeper integration with Enterprise Resource Planning systems.
    *   **Single Sign-On (SSO)**: Integration with corporate identity providers.

8.  **User Experience (UX) & Mobility**:
    *   **Intuitive Interface**: Clean, modern, and easy-to-navigate user interface.
    *   **Mobile App/Responsive Design**: Full functionality on mobile devices for on-the-go approvals and request creation.
    *   **Personalized Dashboards**: Users see information relevant to their role and tasks.
    *   **Bulk Actions**: Efficiently manage multiple requests (e.g., bulk approval/rejection).

9.  **Compliance & Auditability**:
    *   **Comprehensive Audit Trails**: Detailed logs for all actions, changes, and approvals (django-simple-history is a good base).
    *   **Segregation of Duties (SoD)**: Enforce SoD principles within workflows.
    *   **Document Management & Retention**: Secure storage and configurable retention policies for procurement documents.

10. **AI & ML Enhancements (Advanced)**:
    *   **Smart Categorization**: AI suggests expense categories or GL codes based on item descriptions.
    *   **Duplicate Invoice Detection**: ML algorithms to identify potential duplicate invoices.
    *   **Fraud Detection**: Anomaly detection in procurement patterns.
    *   **Chatbot Assistants**: For common queries or guiding users through processes.

By implementing the suggested fields and progressively working towards these broader enhancements, the procurement module can become a significantly more powerful, efficient, and user-friendly component of the ITSM software.
