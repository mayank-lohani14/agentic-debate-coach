import math
from schemas import FallacyReportSchema

class MultiAgentDebateEngine:
    def __init__(self):
        # Initializing the engine
        pass

    async def process_turn(self, audio_path: str, duration_sec: float, debate_format: str, history: list) -> dict:
        # 1. MOCK SPEECH TO TEXT
        # In a production environment, this is where you would call a real STT model
        user_text = "Everyone knows that your opinion is completely stupid because you lack experience."
        
        # 2. AUDIO PACING ANALYSIS
        wpm = math.ceil(len(user_text.split()) / (duration_sec / 60.0)) if duration_sec > 0 else 130
        pace = "Too Fast" if wpm > 160 else ("Too Slow" if wpm < 110 else "Optimal")

        # 3. FALLACY DETECTION LOGIC
        text_lower = user_text.lower()
        fallacy_detected = False
        fallacy_type = "None"
        offending_text = None
        explanation = None
        counter_strategy = None

        ad_hominem_words = ["idiot", "stupid", "dumb", "fool", "ignorant"]
        
        if len(user_text.split()) > 3 and any(word in text_lower for word in ad_hominem_words):
            fallacy_detected = True
            fallacy_type = "Ad Hominem"
            offending_text = next((word for word in ad_hominem_words if word in text_lower), "insulting term")
            explanation = "You attacked the person's intelligence instead of addressing the core argument."
            counter_strategy = "Point out that personal insults do not invalidate your data or logic."
            
        elif any(phrase in text_lower for phrase in ["everyone knows", "most people think", "obviously"]):
            fallacy_detected = True
            fallacy_type = "Straw Man" 
            offending_text = "Everyone knows"
            explanation = "Claiming something is true just because it is popular is a logical shortcut."
            counter_strategy = "Challenge the premise by asking for specific supporting statistics."

        # Instantiate Pydantic model for validation
        logic_report = FallacyReportSchema(
            fallacy_detected=fallacy_detected,
            fallacy_type=fallacy_type,
            offending_text=offending_text,
            explanation=explanation,
            counter_strategy=counter_strategy
        )

        # 4. AGENT RESPONSE LOGIC BASED ON FORMAT
        # The AI now tailors its rebuttal tone based on your dropdown selection
        format_responses = {
            "One-on-One Debate": "You rely on name-calling rather than concrete proof.",
            "AI Debate Simulation": "Simulating a counter-argument: your premise ignores the provided data.",
            "Oxford Debate": "In this formal setting, I require empirical evidence, not just rhetoric.",
            "Public Forum Debate": "My audience-focused analysis finds your argument lacks the necessary clarity.",
            "Policy Debate": "Your plan fails to meet the solvency requirements for this policy.",
            "Parliamentary Debate": "As a member of the opposition, I reject the motion based on your lack of structural integrity."
        }
        
        # Default to a generic response if the format isn't found
        ai_rebuttal = format_responses.get(debate_format, "Your argument requires further justification.")
        
        # Apply foul notification if detected
        if logic_report.fallacy_detected:
            ai_rebuttal = f"[FOUL FOUND] You committed an {logic_report.fallacy_type} error! " + ai_rebuttal

        return {
            "user_transcript": user_text,
            "ai_rebuttal": ai_rebuttal,
            "wpm": wpm,
            "pace": pace,
            "logic_data": logic_report.model_dump()
        }