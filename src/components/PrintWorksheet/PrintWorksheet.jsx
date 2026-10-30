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
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>TruthGrid Literary Analysis</h1>
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

        {/* Instructions */}
        <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#444' }}>
          <strong>Directions:</strong> Answer the writing task with an arguable {activeLabels.topicSentence.toLowerCase()}. Use at least three evidence-and-explanation sets to support your claim; this sheet provides three spaces, so add more if your teacher asks. Think of your claim as a tabletop and each set as a supporting leg. In Literary Analysis, repeat the central {activeLabels.point.toLowerCase()}; in Essay, develop a different {activeLabels.point.toLowerCase()} in each section.
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
            Use TAG (Title, Author, Genre), echo key words from the task, and make an arguable claim that answers it. Example task: “How does Nia change?” Example: “In the short story ‘The Last Lantern,’ A. Rivera shows Nia changing from avoiding responsibility to protecting her community, suggesting that courage grows when people act for others.”
          </p>
          <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
          <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
        </div>

        {isLiteraryAnalysis && (
          <div style={{ border: '1.5px solid #222', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Central {activeLabels.point}</h3>
            <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>Write this once. Repeat the same point in all three sections, supported by different evidence.</p>
            <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
            <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
          </div>
        )}

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
                1. {activeLabels.link} (transition, integrated context/quote, or logical connection to the previous section):
              </label>
              <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333' }}>
                2. {activeLabels.point} {isLiteraryAnalysis ? '(repeat the central point above)' : '(a distinct claim / argument)'}:
              </label>
              <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
              <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333' }}>
                3. {activeLabels.example} (brief quote or detail, with context):
              </label>
              <p style={{ fontSize: '0.78rem', color: '#555', margin: '0.25rem 0' }}>
                Explain what is happening in the text and why this moment supports your argument. Choose only the most useful words; aim for a quote of about 8 words or fewer. Example: When [brief event], [character] says, “[short quote],” revealing [connection to your point].
              </p>
              <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
              <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333' }}>
                4. {activeLabels.explanation} (analyze the evidence and connect it to your claim):
              </label>
              <p style={{ fontSize: '0.78rem', color: '#555', margin: '0.25rem 0' }}>
                Zoom in on the exact word or phrase that supports your explanation. Explain what it suggests and how the figurative language works, if present; do more than repeat the quote.
              </p>
              <div style={{ borderBottom: '1px dashed #777', height: '24px', marginTop: '4px' }}></div>
              <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
              <div style={{ borderBottom: '1px dashed #777', height: '24px' }}></div>
            </div>
          </div>
        ))}

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
