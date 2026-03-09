"""
Kyra-specific template responses.

These are injected into the classifier for common AI worker queries
that can be answered without any API call.

Templates are keyed by trigger phrases. When a user query matches,
the response is returned instantly at $0 cost.

Agencies train their AI workers via the Kyra dashboard — that training
data gets ingested here as additional templates for that client.
"""

# Common greeting/closing templates (Tier 0 — always free)
GREETING_TEMPLATES = {
    "hi": "Hi there! How can I help you today?",
    "hello": "Hello! What can I assist you with?",
    "hey": "Hey! What do you need?",
    "thanks": "You're welcome! Is there anything else I can help with?",
    "thank you": "Happy to help! Anything else?",
    "bye": "Take care! Feel free to reach out anytime.",
    "goodbye": "Goodbye! Have a great day.",
    "ok": "Got it! Let me know if you need anything else.",
    "okay": "Sounds good! Anything else I can help with?",
    "sounds good": "Great! Let me know if you have any other questions.",
}

# Common business/agency AI worker queries (Tier 0 — always free)
# These are the bread-and-butter queries that make up ~60% of all AI worker traffic.
# The AI worker's actual trained responses override these when available.
BUSINESS_TEMPLATES = {
    # Availability
    "are you open": "Yes, I'm available 24/7! What can I help you with?",
    "are you available": "I'm available right now! What do you need?",
    "is someone available": "I'm here to help right now. What can I assist you with?",

    # Hours
    "what are your hours": "Please check with our team for current business hours. I'm available 24/7 to answer questions!",
    "when are you open": "Our AI assistant is available 24/7. For in-person hours, please contact us directly.",
    "what time do you close": "Our AI assistant never closes! For in-person visits, please contact us for hours.",
    "what time do you open": "Our AI assistant is available right now. For in-person hours, please contact us.",

    # Booking/appointments
    "how do i book": "I can help you book! Please share your preferred date and time and I'll get that set up.",
    "can i book": "Absolutely! What date and time works best for you?",
    "i want to book": "I'd love to help you book! What date and time are you looking at?",
    "book an appointment": "Let's get you booked! What date and time works best for you?",
    "make an appointment": "Of course! What date and time would you like?",
    "schedule an appointment": "I can help with that! What date and time works for you?",

    # Pricing
    "how much does it cost": "Pricing depends on what you're looking for. Could you share more details so I can give you accurate information?",
    "what is the price": "Pricing varies by service. Let me know what you're interested in and I'll get you the right information.",
    "how much is it": "That depends on what you need! Tell me more and I'll get you accurate pricing.",
    "what does it cost": "Costs vary by service. Share what you're looking for and I'll get you the details.",

    # Location
    "where are you located": "Please reach out to our team for our current location details. Is there anything else I can help with?",
    "what is your address": "For our address and directions, please contact us directly. Anything else I can help with?",

    # Contact
    "how do i contact you": "You can reach our team directly or continue chatting here — I'm available 24/7!",
    "can i speak to someone": "I'm here to help! If you need to speak with a person, I can escalate your request right away.",
    "can i talk to a person": "Of course! I'll connect you with our team. In the meantime, is there anything I can answer for you?",
    "i need to speak to someone": "Understood — I'll flag this for our team right away. Can you share your contact details?",

    # General
    "are you a bot": "I'm an AI assistant here to help you! I can answer questions, help with bookings, and more. What do you need?",
    "are you ai": "Yes, I'm an AI assistant! I'm here to help 24/7. What can I do for you?",
    "are you real": "I'm an AI assistant — real and ready to help! What do you need?",
    "who are you": "I'm your AI assistant, here to help 24/7. What can I do for you today?",
}

# All templates combined
ALL_TEMPLATES = {**GREETING_TEMPLATES, **BUSINESS_TEMPLATES}


def get_template_response(query: str) -> str | None:
    """
    Check if a query matches a known template. Returns the response if matched, None otherwise.
    Matching is case-insensitive and checks for substring matches on short queries.
    """
    q = query.lower().strip().rstrip("?!.")

    # Exact match first
    if q in ALL_TEMPLATES:
        return ALL_TEMPLATES[q]

    # Substring match for short queries (< 8 words)
    if len(q.split()) < 8:
        for trigger, response in ALL_TEMPLATES.items():
            if trigger in q or q in trigger:
                return response

    return None
