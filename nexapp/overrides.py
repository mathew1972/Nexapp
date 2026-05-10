import frappe
from helpdesk.helpdesk.doctype.hd_ticket.hd_ticket import HDTicket

class NexappHDTicket(HDTicket):
    def on_communication_update(self, c):
        # `on_communication_update` is called when a communication is linked/updated.
        # Original logic reopens tickets for ALL incoming emails.
        # We want to disable this reopening to respect the status set by agents (e.g., On Hold, Replied).

        if c.sent_or_received == "Received":
            # 🚫 Reopen logic for incoming emails is intentionally skipped.
            # This prevents status from changing to 'Open' when a customer replies.
            pass

        # If communication is outgoing, it must be a reply from agent
        if c.sent_or_received == "Sent":
            # Set first response date if not set already
            self.first_responded_on = (
                self.first_responded_on or frappe.utils.now_datetime()
            )

            # Standard feature: auto update status on agent reply if enabled in settings
            if frappe.db.get_single_value("HD Settings", "auto_update_status"):
                self.status = frappe.db.get_single_value(
                    "HD Settings", "update_status_to"
                )

        # Fetch description from communication if not set already.
        self.description = self.description or c.content
        
        # Save the ticket, allowing for hooks to run.
        # We use super().save() or just self.save() as it's an override.
        self.save(ignore_permissions=True)
