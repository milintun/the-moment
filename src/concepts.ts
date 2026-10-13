import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";

// TODO: for each concept, import its spec and class, then register it:
// import spec from "@design/concepts/<Concept>.md" with { type: "text" };
// const <concept> = registerConcept({ class: <Concept>Concept, spec, refusals: { ... } });

export const applicationConceptSet = conceptSet({
  // TODO: <Concept>: <concept>,
});
export const { concepts } = applicationConceptSet;
