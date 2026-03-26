Ne commit jamais ce fichier.

## RÈGLE CRITIQUE - Commits

**JAMAIS de co-signature dans les commits** - Cette règle est absolue et NON-NÉGOCIABLE.

- JAMAIS ajouter "Co-Authored-By: Claude" ou toute autre signature dans les messages de commit
- JAMAIS utiliser --trailer, Co-Authored-By, ou toute forme de signature automatique
- Les commits doivent UNIQUEMENT contenir le message de commit demandé, sans aucune attribution à Claude
- Cette règle s'applique à TOUS les commits, qu'ils soient créés via `git commit`, `git commit --amend`, ou toute autre commande git
- Si tu constates qu'un commit contient une co-signature, tu dois immédiatement le corriger en utilisant `git commit --amend` ou `git rebase` pour retirer la signature

**Pourquoi:** Les commits sont audités pour la conformité réglementaire des dispositifs médicaux. Seul l'auteur humain doit apparaître dans l'historique git. Aucune mention d'outils d'IA ne doit figurer dans les commits.

**Exemple de ce qu'il NE FAUT JAMAIS faire:**
```bash
# ❌ INTERDIT
git commit -m "feat: add feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# ✅ CORRECT
git commit -m "feat: add feature"
```

privilégie les listes sémantiques quand tu construits des fichiers html

Evite au maximum les eslint ignore

Un fichier ne doit pas faire plus de 250 lignes

### **Bad Practices to Avoid**

1. **Never use `as Type` casting**: Type assertions bypass TypeScript's type checking and hide potential bugs. If the type doesn't match, fix the underlying issue instead of forcing the type. Use type guards, proper generics, or fix the data flow to ensure type safety.

2. **Never use `refetch()` from Apollo**: Refetching bypasses Apollo's normalized cache and forces a network request, leading to:
   - Poor UX (unnecessary loading states)
   - Wasted bandwidth
   - Cache inconsistencies

   **Use these patterns instead:**
   - `update` function in mutations to update cache after mutation completes
   - `optimisticResponse` for instant UI updates without waiting for network
   - `cache.writeQuery()` to write data directly to the cache
   - `cache.evict()` + `cache.gc()` to remove stale entries
   - `cache.readFragment()` / `cache.readQuery()` to read before modifying

   The cache should be the source of truth. See `use-cache-view.ts` and `use-update-alert-rule.ts` for reference implementations.

3. **Never `await` simple mutations in components**: Using `await` on a mutation call in a component is a code smell. It couples the component to the mutation lifecycle and leads to imperative response handling.

   **Use this pattern instead:**
   - The mutation hook encapsulates **everything**: `variables` building, `update` (cache), and success side effects (toast, navigation, popover hide)
   - Use `useEffect` on the mutation `data` to react to success, combined with `useEffectEvent` for stable callback references
   - The component just calls the hook's function with the form data, no `await`, no response handling
   - The hook exposes `loading` for the component to disable buttons/show spinners if needed

   **Reference:** `use-update-condition-status.tsx`, `useAddEtiology.ts`

   ```tsx
   // ❌ BAD - await + imperative handling in component
   async function handleSubmit(data: FormData) {
     const result = await addEtiology({ variables: { input: { ... } }, update: ... });
     if (result.data?.addPatientEtiology?.__typename !== 'Patient') return;
     toaster.add({ kind: 'success', message: '...' });
     popover.hide();
   }

   // ✅ GOOD - hook encapsulates everything, component just calls
   // In hook:
   const [mutation, { data, loading }] = useMutation(Mutation);
   const doAction = (formData: FormData) => { mutation({ variables: ..., update: ... }); };
   const onSuccess = useEffectEvent(() => { toaster.add(...); popover.hide(); });
   useEffect(() => { if (data?.__typename === 'Success') onSuccess(); }, [data]);
   // In component:
   onSubmit={doAction}  // no await, no response handling
   ```

Vérifie que le code est factorisé, simple, cohérent avec le projet, et qu'il n'engendre pas des effets de bord
 

### **. General Rules**

1. **Follow Standard Conventions**: Adhere to the coding standards and conventions that are prevalent for the languages and tools we use.
2. **Keep It Simple**: Always prefer simpler solutions. Reduce complexity wherever possible.
3. **Boy Scout Rule**: Always leave the code cleaner than you found it. Refactor or clean up every time you make changes.
4. **Root Cause Analysis**: Always strive to find and fix the root cause of a defect, not just the symptoms.
5. **Use Existing Hooks First**: Always check for and prioritize using existing hooks in the codebase before fetching data directly or passing data through props. Search the codebase for relevant hooks (e.g., `usePractitionerFragment`, `useOrganization`) and use them to access data within components.

### **B. Design Rules**

1. **Feature Isolation**: A component outside a feature (`components/`) must never import elements from a feature (`features/`). If a component uses feature-specific elements, it must be placed within that feature and prefixed with the feature name (e.g., `transplant-document-status-badge.tsx` in `features/patient-transplant-files/components/`).
2. **High-Level Configuration**: Keep configurable data at high levels in the code to enhance flexibility.
3. **Separate Multi-threading**: Isolate multi-threading code to manage complexity and enhance maintainability.
4. **Limit Over-Configurability**: Avoid excessive configurability which can lead to complex and unmanageable code.
5. **Use Dependency Injection**: Favor dependency injection to manage dependencies cleanly and flexibly.
6. **Law of Demeter**: Follow the Law of Demeter; a module should only know about direct dependencies.

### **C. Understandability Tips**

1. **Consistency**: If you do something one way, do all similar things in the same way.
2. **Explanatory Variables**: Use explanatory variables to clarify the purpose of complex expressions. 
3. **Encapsulate Boundary Conditions**: Centralize the handling of boundary conditions in a single location.
4. **Avoid Logical Dependencies**: Ensure methods do not have hidden dependencies on internal class state.

### **D. Naming Rules**

1. Everything in english, always. 
2. At least 3 characters rules for naming, unless it’s very explicit with less. 
3. Avoid acronyms at all cost ⬇️
4. **Descriptive Names**: Choose names that describe their purpose or behavior.
5. **Meaningful Distinctions**: Distinguish names in a way that clarifies their differences.
6. **Pronounceable and Searchable Names**: Use names that are easy to pronounce and search through code.
7. **Replace Magic Numbers**: Use named constants instead of magic numbers to enhance readability.

### **E. Function Rules**

1. **Small and Focused**: Functions should be small and focused on a single task.
2. **Descriptive Names**: Function names should clearly describe their behavior.
3. **Limit Arguments**: If possible prefer fewer arguments for simplicity and clarity.
4. **No Side Effects**: Functions should not have side effects. They should not modify any state not contained within them.

### **F. Commenting Rules**

1. **Don’t comment code :** There is no reason to push commented code, if a code is commented it is not used and therefore should not be present. 
2. **Explain Why, Not What**: Use comments to explain why something is done, not what is done.
3. **Avoid Redundant Comments**: Don't add comments that just repeat what the code does.
4. **Clarify Complex Code**: Use comments to clarify complex code operations or decisions.
5. **Intent and Warnings**: Document the intent behind decisions and warn about potential consequences.

### **G. Source Code Structure**

1. **Vertical Separation**: Separate concepts vertically in the code for better readability.
2. **Related Code Should Be Close**: Keep related functions and variables close to each other.
3. **Declare Variables Close to Usage**: Declare variables close to where they are used.
4. **Logical Flow**: Arrange functions in a logical flow downwards, callers above callees.