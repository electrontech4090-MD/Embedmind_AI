from langgraph.graph import StateGraph, START, END
from app.orchestration.state import GraphState
from app.orchestration.agents.requirement_agent import run_requirement_agent
from app.orchestration.agents.design_agent import run_design_agent
from app.orchestration.agents.firmware_agent import run_firmware_agent

def route_after_requirements(state: GraphState) -> str:
    """
    Decides whether to end the turn or proceed to hardware design 
    based on the requirements document completion flag.
    """
    if state.get("is_ready_to_finalize", False):
        return "design_agent"
    return END

# Initialize Graph Builder
builder = StateGraph(GraphState)

# Add Nodes
builder.add_node("requirement_agent", run_requirement_agent)
builder.add_node("design_agent", run_design_agent)
builder.add_node("firmware_agent", run_firmware_agent)

# Add Connection Edges
builder.add_edge(START, "requirement_agent")

builder.add_conditional_edges(
    "requirement_agent",
    route_after_requirements,
    {
        "design_agent": "design_agent",
        END: END
    }
)

builder.add_edge("design_agent", "firmware_agent")
builder.add_edge("firmware_agent", END)

# Compile Graph
graph = builder.compile()
