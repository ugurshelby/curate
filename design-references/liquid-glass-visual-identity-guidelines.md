> ⚠️ **OTORİTE DEĞİL — arka plan / dış strateji notu.** (eklendi: 2026-07-17)
>
> Bu belge dışarıdan gelen bir "görsel kimlik stratejisi" derlemesidir ve
> **canlı Rosso tasarım sistemiyle ÇELİŞİR.** Kod ve `tokens/colour-palettes.md`
> her zaman önce gelir (bkz. `docs/README.md` otorite zinciri).
>
> **Bilinen çelişkiler / hatalar:**
> - Palet önerisi (**Rosso Red #E63946 · Deep Teal #1D3557 · Royal Purple #6A0572**)
>   canlı sistemle uyuşmaz. Rosso gerçekte **amber vurgu (`#F59E0B`) + OLED siyah
>   zemin (`#0A0A0A`), dark-first**tir (`docs/design/tokens/colour-palettes.md`).
> - "Liquid Glass" dili resmî Rosso dili değildir; canlı dil **Modern Endüstriyel
>   Sofistike + Müzik Ruhu** (`rosso-design-system.md`).
> - "Coral Pink `#F1FAEE`" yanlış — `#F1FAEE` kirli beyaz/nane tonudur, coral pembe değil.
>
> **Kullanım:** İlham / arka plan olarak okunur; koda dökülmeden önce canlı sistemle
> doğrulanır. Buradaki hiçbir değer token/kod otoritesi değildir.

---

### Technical Design & Visual Identity Guidelines: The "Rosso" Music Ecosystem

##### 1\. Strategic Visual Philosophy: The "Liquid Glass" & "Halo" Framework

In the competitive landscape of professional music data, a premium visual first impression is a functional requirement, not a cosmetic luxury. Scientific research confirms the "Halo Effect": users form a cognitive judgment of a platform within 50 milliseconds. This split-second impression dictates the perceived trustworthiness and authority of the entire ecosystem. To engineer this positive halo, "Rosso" adopts the  **Liquid Glass**  design language—the industry standard announced on June 9, 2025\. By utilizing refractive lensing properties and varying optical opacities, we create a spatial hierarchy that feels sophisticated and effortless to navigate. This strategic implementation ensures that the complex data processing occurring under the hood is translated into a serene, high-value experience.| Feature | Standard Music Applications | The Rosso Premium Experience || \------ | \------ | \------ || **Visual Depth** | Flat, static UI components. | **Liquid Glass:**  Refractive materials with dynamic depth. || **Information Delivery** | High cognitive load; cluttered layouts. | **Deference Principle:**  AI insights sit in quiet containers. || **User Logic** | Functional but cognitively taxing. | **Cognitive Fluency:**  Effortless paths built for rapid processing. || **Information Hierarchy** | Generic UI patterns. | **Spatial Hierarchy:**  Clearly defined tiers via glass layering. |  
By prioritizing  **Cognitive Fluency** , we ensure the interface recedes, allowing the user's music data to take center stage with absolute clarity.

##### 2\. Color System Architecture: Emotion, Hierarchy, and the "Rosso" Palette

Color in the Rosso ecosystem serves as a critical functional tool for music storytelling. By implementing a rigorous color hierarchy, we minimize the "Interaction Cost" associated with data analysis, allowing users to categorize genres and social matches through pre-attentive processing.

###### *The "Rosso" Palette Definition*

We utilize a combination of  **Analog**  and  **Tetradic**  color methods, utilizing a 100–900 tonal value scale for maximum implementation flexibility.

* **Primary Brand: Rosso Red (\#E63946)**  
* *Psychological Impact:*  Passion and vitality; serves as the "heartbeat" of the ecosystem.  
* **Primary Complement: Deep Teal (\#1D3557)**  
* *Psychological Impact:*  Professionalism and architectural stability; utilized for primary navigation and data containers.  
* **Secondary Luxury: Royal Purple (\#6A0572)**  
* *Psychological Impact:*  Innovation and creative luxury; designated for high-tier "Recap" storytelling.  
* **Semantic Social: Coral Pink (\#F1FAEE)**  
* *Psychological Impact:*  Approachability and warmth; utilized for social affinity "Halo" indicators.

###### *Color Combinations for Data Visualization*

1. **Monochromatic (Music Recaps):**  Utilizes varying tonal values of a single hue (e.g., Deep Teal 100–900) to create a calm, sophisticated environment for long-form data reading.  
2. **Complementary (Social Matching):**  Pairs Rosso Red with its Teal complement to highlight high-affinity matches and points of divergence in social datasets.  
3. **Analog (Genre Transitions):**  Essential for maintaining emotional flow. Transitioning from  **Ambient**  to  **Deep House**  must utilize an Analog palette of  **Blue-Green to Green** , ensuring the transition feels natural and reduces the mental effort of processing mood shifts.These visual choices are codified through a rigorous design token system to ensure cross-platform engineering precision.

##### 3\. Design Token Engineering: CSS Architecture for Scalability

Design Tokens serve as the "nicknames" for our design decisions, acting as the definitive interface between visual strategy and frontend implementation. By abstracting hard-coded values into a 3-tier framework, we ensure brand consistency across web and mobile deployments.

###### *3-Tier Design Token Naming Framework*

We strictly adhere to a  **kebab-case**  naming convention, mapping tokens directly to CSS Custom Properties for engineering efficiency.  
{  
  "global": {  
    "rosso-color-red-500": "\#E63946",  
    "rosso-space-xx-small": "4px",  
    "rosso-space-x-large": "64px",  
    "rosso-z-index-glass-overlay": "100"  
  },  
  "alias": {  
    "color-background-primary": "rosso-color-teal-900",  
    "color-text-vibrant": "rosso-color-red-500",  
    "space-padding-standard": "rosso-space-medium"  
  },  
  "component": {  
    "music-player-bg-active": "color-background-primary",  
    "social-match-indicator-glow": "rosso-color-coral-200",  
    "glass-panel-z-index": "rosso-z-index-glass-overlay"  
  }  
}

###### *Rationale for Scale-Based Naming*

Following the  **"T-shirt size" methodology**  (xx-small to x-large), we provide a descriptive scale for spacing and sizing. This allows the system to remain modular; developers can adjust density globally without manually renaming variables. These tokens provide the structural integrity required to support our typography and information hierarchy.

##### 4\. Typography & Information Hierarchy

Typography is the "Contractor" of the Rosso experience, orchestrating information with authority. We balance the  **Deference Principle** —making UI text quiet—with high-impact storytelling for recaps. To maintain contrast in low-light environments, we account for  **Gaussian blurring**  and the refractive lensing of Liquid Glass materials.| Level | Font Selection | Weights | Tonal Values | Use Case || \------ | \------ | \------ | \------ | \------ || **Headers** | **Premium Serif** | 700 (Bold) | 800–900 | Narrative & Storytelling || **Sub-headers** | **Clean Sans-serif** | 600 (Semibold) | 600–700 | Technical Data Labels || **Body** | **Clean Sans-serif** | 400 (Regular) | 100–300 | Social Matching Logic |  
Contrast ratios are maintained against  **Frosted Glass**  backgrounds by utilizing high tonal values for text. This creates a clear boundary between the "Story" (the narrative of your music year) and the "Stats" (technical music data).

##### 5\. AI Interaction Patterns: The "Shimmer" and Social Recaps

AI involvement in Rosso must be signaled clearly without violating the Deference Principle. We utilize motion design to communicate that the system is "orchestrating" the user's data rather than merely displaying it.

###### *The Three States of AI*

* **Pre-AI (Stationary):**  The base UI state. The interface remains clean and usable, reflecting the standard high-end music environment without active glows.  
* **AI-Active (The Shimmer):**  A multi-color  **LinearGradient**  rendered around the boundary of the affected region.  
* **Colors:**  A four-color gradient consisting of  **Teal-Blue, Soft Violet, Coral Pink, and Warm Amber** .  
* **Motion:**  A 1.8-second hue rotation cycle. The animation  **accelerates at the start ("waking up")**  and  **decelerates upon completion** , signaling the resolution of the processing task.  
* **Quality:**  Must include a  **Soft Glow Halo**  to emphasize the refractive qualities of the Liquid Glass layer.  
* **AI-Resolved (Presentation):**  The shimmer fades out over 0.4s. The result is presented with  **Source Attribution** , featuring a  **16x16pt icon**  of the source app and the source name at the top of the AI-affected region.These patterns ensure transparency, building trust by showing exactly where AI output is derived from.

##### 6\. Mobile & Web UX: Interaction Design and Social Matching

To maximize completion rates in social matching and data exploration, we focus on minimizing interaction cost. Following the  **Peak-End Rule** , we design the user journey to conclude with high emotional resonance.

###### *Mobile Best Practices*

* **Eliminate Typing:**  We prioritize  **Radio Buttons**  and  **T-shirt sized buttons**  over dropdowns to ensure music preferences are glanceable and selectable with a single tap.  
* **Forced Focus:**  Auto-focus the primary interaction point to eliminate unnecessary taps, fostering  **Cognitive Fluency** .  
* **The Deference Principle:**  Complex summaries are presented in collapsed cards that expand only upon explicit user request.

###### *The "Final Note" and Peak Emotion*

We architect the  **"Recap Completion"**  screen to act as the peak of the experience. The interaction concludes with a high-contrast visual summary optimized for social sharing. This "Final Note" uses micro-interactions—subtle glass-like shimmers and animations—to signal a successful data journey.By applying these rigorous architectural standards, the Rosso Music Ecosystem transforms raw data into a sophisticated, professional experience that respects the user's intelligence and time.  
