"""
Two LangChain runnables built on top of the prompts in prompts/ats_prompts.py.

We use PydanticOutputParser (format instructions embedded IN the prompt)
rather than `.with_structured_output()` here on purpose: this app is
built to work with any HF chat model, and many open-weight 7-8B models
don't reliably support tool-calling based structured output. The
PydanticOutputParser approach works with literally any text-generating
chat model. If you swap llm.py to Claude or GPT-4o, you can switch
`scoring_chain` to `prompts.scoring_prompt | llm.with_structured_output(ATSReport)`
for even more reliable parsing.
"""
from __future__ import annotations
from langchain_core.output_parsers import PydanticOutputParser, StrOutputParser
from app.prompts.ats_prompts import scoring_prompt, qa_prompt
from app.schemas import ATSReport, ChatMessage
from app.services.llm import get_chat_model

_llm = get_chat_model()

_parser = PydanticOutputParser(pydantic_object=ATSReport)

scoring_chain = (
    scoring_prompt.partial(format_instructions=_parser.get_format_instructions())
    | _llm
    | _parser
)

qa_chain = qa_prompt | _llm | StrOutputParser()


def to_langchain_history(history: list[ChatMessage]):
    from langchain_core.messages import HumanMessage, AIMessage
    out = []
    for m in history:
        out.append(HumanMessage(content=m.content) if m.role == "user" else AIMessage(content=m.content))
    return out
