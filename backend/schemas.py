from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

# --- Existing Milestone 2 Schemas ---

class FallacyReportSchema(BaseModel):
    fallacy_detected: bool = Field(description="True ONLY if a fallacy is committed.")
    fallacy_type: str = Field(description="Must be 'Ad Hominem', 'Straw Man', 'False Dilemma', or 'None'.")
    offending_text: Optional[str] = Field(default=None, description="The broken phrase.")
    explanation: Optional[str] = Field(default=None, description="Why the reasoning failed.")
    counter_strategy: Optional[str] = Field(default=None, description="How to attack this error.")

class DebateTurnResponseSchema(BaseModel):
    user_transcript: str
    ai_rebuttal: str
    words_per_minute: int
    pace_status: str
    fallacy_metrics: Dict[str, Any]

# --- New Milestone 3 Schemas ---

class FeedbackAction(BaseModel):
    critique: str = Field(description="The specific criticism of the user's argument.")
    rewrite_recommendation: str = Field(description="An actionable example of how to rephrase the argument to make it stronger.")

class CounterArgument(BaseModel):
    rebuttal_type: str = Field(description="Must be one of: Logical, Evidence-Based, Ethical, Practical")
    rebuttal_text: str = Field(description="The actual counterargument against the user's claim.")
    challenge_question: str = Field(description="A probing question to challenge the user's stance.")

class AIRebuttalResponse(BaseModel):
    counter_argument: CounterArgument
    argument_quality_score: int = Field(ge=0, le=100)
    evidence_usage_score: int = Field(ge=0, le=100)
    logical_consistency_score: int = Field(ge=0, le=100)
    rebuttal_effectiveness_score: int = Field(ge=0, le=100)
    communication_skills_score: int = Field(ge=0, le=100)
    actionable_feedback: List[FeedbackAction]
    # BRINGING BACK THE FALLACY DETECTOR FOR MILESTONE 3:
    fallacies_detected: List[FallacyReportSchema] = Field(description="List of logical fallacies committed by the user, if any.", default_factory=list)