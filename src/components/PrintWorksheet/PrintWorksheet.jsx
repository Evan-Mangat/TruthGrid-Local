import React, { useEffect } from 'react'

export default function PrintWorksheet({ config, onBack }) {
  const { passage, labels, mode } = config || {}
  const activeLabels = {
    topicSentence: 'Topic Sentence',
    link: 'Link',
    point: 'Point',
    example: 'Example',
    explanation: 'Explanation',
    concludingSentence: 'Concluding Sentence',
    ...(labels || {}),
  }
  const numPoints = 3
  const isLiteraryAnalysis = mode === 'literary_analysis'

  useEffect(() => {
    // Optional auto-print or ready
  }, [])

  return (
    <div className="page print-worksheet-page" style={{ maxWidth: '800px' }}>
      {/* On-screen controls - hidden when printing */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          background: '#f0f4f8',
          padding: '0.8rem 1rem',
          borderRadius: 'var(--radius)',
        }}
      >
        <div>
          <strong>Blank Worksheet Print View</strong>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Ready to print physical copies for students to complete by hand.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ Print Now
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="printable-worksheet" style={{ color: '#000', background: '#fff' }}>
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>CREATIVE WRITING 10</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{isLiteraryAnalysis ? 'TRUTHGRID LITERARY ANALYSIS' : 'ESSAY EXAM TEMPLATE'}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>MS. L. KWAN</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', fontSize: '1rem' }}>
            <span>Name: ____________________________________</span>
            <span>Date: ____________</span>
            <span>Block/Period: _______</span>
          </div>
        </div>

        {/* Reading Passage */}
        <div style={{ border: '1px solid #333', padding: '0.8rem', marginBottom: '1.25rem', borderRadius: '4px' }}>
          <strong style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Reading Passage for Analysis (Source Text):
          </strong>
          <p style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#555' }}>
            Use this source text to compare with your ideas and choose evidence. Do not write your draft here.
          </p>
          {passage && passage.trim() ? (
            <p style={{ marginTop: '0.5rem', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
              {passage}
            </p>
          ) : (
            <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
              [ Teacher: Write or paste the source text students will analyze here ]
            </div>
          )}
        </div>

        {isLiteraryAnalysis ? (
          <>
            {/* Instructions */}
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#444' }}>
              <strong>Directions:</strong> Answer the writing task with an arguable {activeLabels.topicSentence.toLowerCase()}. Use at least three evidence-and-explanation sets to support your claim; this sheet provides three spaces, so add more if your teacher asks. Repeat the central {activeLabels.point.toLowerCase()} across all three sections.
              <span style={{ display: 'block', marginTop: '0.35rem' }}>
                Structure: <strong>{activeLabels.topicSentence}</strong> → [{activeLabels.link} + {activeLabels.point} → {activeLabels.example} → {activeLabels.explanation}] × 3 → <strong>{activeLabels.concludingSentence}</strong>.
              </span>
            </p>

            {/* Topic Sentence box */}
            <div style={{ border: '1.5px solid #222', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', pageBreakInside: 'avoid' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', borderBottom: '1px solid #ccc', paddingBottom: '0.25rem' }}>
                {activeLabels.topicSentence}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
                Use TAG (Title, Author, Genre), echo key words from the task, and make an arguable claim that answers it.
              </p>
              <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
              <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
            </div>

            <div style={{ border: '1.5px solid #222', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', pageBreakInside: 'avoid' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Central {activeLabels.point}</h3>
              <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>Write this once. Repeat the same point in all three sections, supported by different evidence.</p>
              <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
              <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
            </div>

            {/* Points grid */}
            {Array.from({ length: numPoints }).map((_, i) => (
              <div
                key={i}
                style={{
                  border: '1.5px solid #222',
                  borderRadius: '4px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  pageBreakInside: 'avoid',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', borderBottom: '1px solid #ccc', paddingBottom: '0.25rem' }}>
                  {activeLabels.point} {i + 1} {numPoints > 1 ? `of ${numPoints}` : ''}
                </h3>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333' }}>
                    1. {activeLabels.link} (transition, integrated context/quote, or logical connection):
                  </label>
                  <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333' }}>
                    2. {activeLabels.point} (repeat the central point above):
                  </label>
                  <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333' }}>
                    3. {activeLabels.example} (brief quote or detail, with context):
                  </label>
                  <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
                  <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333' }}>
                    4. {activeLabels.explanation} (analyze the evidence and connect it to your claim):
                  </label>
                  <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
                  <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Ms. Kwan's 5-Paragraph Essay Exam Template */}
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#444' }}>
              <strong>Directions:</strong> In an in-class essay exam, the <strong>Thesis Statement MUST be the FIRST sentence</strong>. Include the 3 Main Ideas in order. Each body paragraph develops one Main Point with an Assertion (topic sentence), 3 specific Evidence-plus-Commentary pairs, and a Concluding Sentence that never ends with a quotation.
            </p>

            {/* Introduction Box */}
            <div style={{ border: '1.5px solid #222', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', pageBreakInside: 'avoid' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', borderBottom: '1px solid #ccc', paddingBottom: '0.25rem' }}>
                I. INTRODUCTION
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
                <strong>1st Sentence (Thesis Statement):</strong> Echo the prompt, make a claim, and preview Main Ideas A, B, and C in order.
              </p>
              <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
              <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>

              <p style={{ fontSize: '0.8rem', color: '#555', marginTop: '8px', marginBottom: '4px' }}>
                <strong>Sentences 2–4 & Transition:</strong> Mention each main idea; define terms and their relevance; transition into body.
              </p>
              <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
              <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
            </div>

            {/* Body Paragraphs 1-3 */}
            {['1ST MAIN POINT', '2ND MAIN POINT', '3RD MAIN POINT'].map((pointLabel, idx) => (
              <div key={idx} style={{ border: '1.5px solid #222', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', pageBreakInside: 'avoid' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', borderBottom: '1px solid #ccc', paddingBottom: '0.25rem' }}>
                  II. BODY — {pointLabel} (Group {String.fromCharCode(65 + idx)})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
                  <strong>ASSERTION / TOPIC SENTENCE:</strong> Must contain the topic of the paragraph and the opinion being supported.
                </p>
                <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>

                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, margin: '4px 0 2px' }}>1) Evidence (quote/paraphrase) + Commentary (connects back to thesis):</p>
                  <div style={{ borderBottom: '1px dashed #777', height: '22px' }}></div>
                  <div style={{ borderBottom: '1px dashed #777', height: '22px' }}></div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, margin: '4px 0 2px' }}>2) Evidence (quote/paraphrase) + Commentary (connects back to thesis):</p>
                  <div style={{ borderBottom: '1px dashed #777', height: '22px' }}></div>
                  <div style={{ borderBottom: '1px dashed #777', height: '22px' }}></div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, margin: '4px 0 2px' }}>3) Evidence (quote/paraphrase) + Commentary (connects back to thesis):</p>
                  <div style={{ borderBottom: '1px dashed #777', height: '22px' }}></div>
                  <div style={{ borderBottom: '1px dashed #777', height: '22px' }}></div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '0.8rem', color: '#555', margin: '4px 0 2px' }}>
                    <strong>CONCLUDING SENTENCE:</strong> Summarize the thesis of your topic sentence; wrap things up. <em>Never end with a quotation.</em>
                  </p>
                  <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
                </div>
              </div>
            ))}

            {/* Conclusion Paragraph */}
            <div style={{ border: '1.5px solid #222', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', pageBreakInside: 'avoid' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', borderBottom: '1px solid #ccc', paddingBottom: '0.25rem' }}>
                III. CONCLUSION
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
                Echo theme; revisit 3 ideas; wrap up; relevance to humanity? <strong>SO WHAT? Why does it matter? What's the point? Connections?</strong>
              </p>
              <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
              <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
              <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
            </div>
          </>
        )}

        {/* Concluding Sentence box */}
        <div style={{ border: '1.5px solid #222', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', borderBottom: '1px solid #ccc', paddingBottom: '0.25rem' }}>
            {activeLabels.concludingSentence}
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
            Restate the central idea in a fresh way. Example finish: “A society shaped by [factor] may sacrifice genuine human connection and lose the empathy that makes a society truly human.”
          </p>
          <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
          <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
        </div>

        <div style={{ border: '1px solid #777', padding: '0.65rem', marginBottom: '1rem', pageBreakInside: 'avoid' }}>
          <strong style={{ fontSize: '0.9rem' }}>Final Conventions Check</strong>
          <ul style={{ fontSize: '0.8rem', margin: '0.35rem 0 0', paddingLeft: '1.25rem' }}>
            <li>Use literary present tense when writing about the text (e.g. “Nia realizes”).</li>
            <li>Use third person; avoid “I,” “you,” and “we” in your analysis.</li>
            <li>Proofread for complete sentences, grammar, spelling, and punctuation. Read your work aloud if it helps.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
