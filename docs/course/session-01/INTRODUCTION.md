# Session 1 — Understanding the foundations of Loom

This reader explains what we are working towards, what Loom is, and why we begin with a small agent application. Read it before the session to get your bearings, and return to it afterwards to connect the workshops with the larger picture. The practical steps are in the [workshop guide](WORKSHOP.md).

## What are we trying to achieve?

The aim of the campus is to develop a team that can **design and implement an agentic application**: an application in which AI can interpret a task, choose from the actions it has been given, use information, and work towards a result.

That requires several kinds of judgement. The team needs to decide what the AI should do, what information it should receive, which actions it may take, how its work will be checked, and where a person must make a decision. It also needs to turn those choices into working software that colleagues can understand and maintain.

You may use AI to help write that software. Here, our main subject is the behaviour of the application you build: how it uses AI while someone is working with it.

We will practise these skills by building **Loom**. Loom gives the team a shared product to work on, so that the ideas become visible in something you can run, inspect and improve. The intended outcome is both a working reference application and a team able to make informed design and implementation decisions in other projects.

## What is Loom?

Loom is an engineering workspace that helps a team turn source material into a shared, reviewed understanding of a software solution.

A project often begins with a mixture of documents, conversations, business requests and information from existing systems. These sources can be incomplete, use different words for the same thing, or disagree. Before designing the software, the team needs to understand who will use it, what it should do, which systems it must work with, and which questions still need an answer.

Loom is intended to help with that work. Its AI can read material, identify useful information, suggest connections and point out uncertainty. People review those suggestions and decide what becomes part of the team's agreed understanding. As the product develops, that understanding can support architecture, engineering documents and software, and help the team see what needs attention when something changes.

The connection to the original material matters throughout. If Loom suggests a requirement or a design change, the team should be able to ask: **Where did this come from, and why should we accept it?**

![Design mock-up of Loom, with source material on the left, a connected solution model in the centre, and proposals and evidence on the right.](images/loom-workspace-mockup.png)

*A design mock-up of the larger Loom workspace. Look at the relationship between sources, the shared picture of the solution, and suggestions awaiting review. This illustrates the direction of the product; it is not a screenshot of the Session 1 application.*

### Where does FruitTrucks fit?

FruitTrucks is the fictional business example we use to give Loom something concrete to work on. It distributes fresh produce and wants better coordination of deliveries. Its initial solution brief describes problems such as route changes being missed and customer service having to phone a driver to find out when a delivery will arrive.

There are two different applications in this story. **Loom is the engineering application we build. The delivery application is the solution that Loom helps us understand and design.** In Session 1, we ask our small agent application to analyse FruitTrucks' brief. We are building the machinery that supports that analysis, rather than building a delivery scheduling system.

## What does Session 1 contribute?

Session 1 starts with a deliberately small task: read an available solution brief and produce an organised analysis, supported by evidence from that brief. The analysis identifies people and roles, needed capabilities, existing systems, constraints and open questions.

The completed demonstration has a simple console. You can give it a task, see which source and actions are available, follow the agent's activity, and inspect the stored result.

![Completed Session 1 demonstration: the task and permitted tools appear on the left, agent activity in the middle, and the validated, stored analysis on the right.](images/demo-app-complete.png)

*The completed Session 1 demonstration. Reading from left to right, you can see the task, the work carried out, and the result saved by the application. This is the completed instructor example; the participant starting point contains three pieces to implement in the workshops.*

This console demonstrates a foundation for Loom. The larger product's shared model, review process and design workspace will build on the ability to perform a controlled, understandable analysis. We start by making that foundation visible, before adding the broader product behaviour.

At the end of Session 1, your team should have a small working agent application and be able to explain why it behaves as it does: what it can read, which actions it can take, how a result is checked and saved, and how you can follow its execution.

## What do we mean by a harness?

Think about asking a colleague to investigate a question. You would normally give them a brief, access to relevant material, a clear remit, and a way to report their findings. You would also explain which decisions they can make and which need someone else's approval.

An AI needs an equivalent working arrangement. **The harness is the software around the AI that gives it its task, information, available actions and operating rules, and manages what happens during and after the work.**

In our application, that includes deciding which source can be read, making a small set of actions available, checking requests and results, recording what happened, saving the output, and allowing a run to be stopped. Instructions describe the desired behaviour; the surrounding software carries out the checks and controls the changes.

A **tool**, in this setting, is an action the application makes available to the agent. For example, one tool reads an allowed source and another submits an analysis for checking and storage. The AI can request those actions; the application decides whether and how to carry them out.

GitHub Copilot provides the software that manages the AI's interaction with the model and its choice of tools within the task. The code you work on supplies the task, tools and application rules. Learning how these responsibilities fit together is central to Session 1.

## Why these three workshops?

The three workshops follow the path from **information**, through **action**, to a **recorded result**. Each asks an engineering question that will continue to matter as Loom grows.

### Workshop 1: What may the agent read?

The first workshop completes access to the declared source. The agent must request an available source and the application must check that request before reading it. The application also remembers which source was actually read during the run.

This makes the input to the analysis explicit. It gives the team a way to explain where the information came from and to reject a request for something outside the allowed material.

For the future Loom, this is the beginning of controlled access to project knowledge. A richer workspace will have more sources, but it will still need clear rules about what may be read and a record of the material used.

### Workshop 2: Which actions can the agent use?

The second workshop connects Copilot to the application's supplied tools and instructions. The existing controls restrict the agent to the actions provided for this task.

This is where the task becomes executable: the agent can discover the source, read it and try to submit an analysis. The team can observe the requests and understand the role of each action. A request can also be refused, with a reason that is visible in the execution.

For the future Loom, the same design question applies to actions such as interpreting new material, proposing a change or checking the effect of an edit. Each action needs a clear purpose and limits. Adding capability to an agent also means designing the control around that capability.

### Workshop 3: When does an analysis become a saved result?

The third workshop completes storage of the analysis after the existing checks have passed. Those checks require an organised result and evidence that quotes material read during the run. The application saves the result against that run and prevents a second successful submission from replacing it.

A result saved in this way can be inspected again after the page is refreshed. The team has something concrete to examine beyond the agent's final message.

For the future Loom, this provides a foundation for storing proposals and the evidence behind them. **Saving a checked analysis in Session 1 does not mean that a person has approved its meaning.** Human review and acceptance belong to the broader product we are working towards. A result can have the expected shape and quote a real source while still needing someone to judge its interpretation.

## How the pieces work together

Consider the question: “What should FruitTrucks' new delivery application be able to do?”

The agent discovers the available brief and asks to read it. The application checks that the source is allowed and supplies its contents. The agent interprets the brief, then submits an analysis with supporting quotations. The application checks the submission and saves it if those checks pass. The console lets you follow the work and inspect the outcome.

The AI contributes interpretation and choices within the task. The application controls access, checks requests and records the result. Your team designs the arrangement between them.

In the larger Loom, an analysis like this can become input to a proposal that a person reviews. Accepted information can then contribute to the team's shared understanding of the solution and the engineering work that follows. Session 1 gives us a controlled starting point for that longer journey.

## What to take away

After the session, use the demonstration to explain three things to a colleague: how the agent gets its information, how its actions are controlled, and how its work becomes an inspectable result. Connect each explanation to one of the workshops.

You should also be able to place that result in the larger picture: your team is learning to build agentic applications; Loom is the product used to practise those skills; and the harness is the foundation that lets Loom's AI work within rules the team can understand and defend.

For the practical exercises, continue with [WORKSHOP.md](WORKSHOP.md). For the more precise concepts and checks, use [THEORY.md](THEORY.md) and [VALIDATION.md](VALIDATION.md).

## Starting the next session

Each session starts from its supplied full starter in a fresh folder. Earlier reference implementations are included; keep your previous work for comparison. Learner improvements and database history do not transfer automatically. Complete local setup before class using [the session-start guide](../../../SESSION-START.md) and [QUICKSTART](../../../QUICKSTART.md). Carrying selected improvements forward is optional work after class.
