const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

console.log('Embedding visual architecture diagram, app screenshot, and GitHub link into PPTX...');

const templateZip = new AdmZip(path.join(__dirname, 'template.pptx'));

// 1. Add images into ppt/media/
const archImg = fs.readFileSync(path.join(__dirname, 'ChalaakSaathi_Architecture_Diagram.png'));
const appImg = fs.readFileSync(path.join(__dirname, 'app_screenshot.png'));

templateZip.addFile('ppt/media/arch_diagram.png', archImg);
templateZip.addFile('ppt/media/app_screenshot.png', appImg);

// 2. Update [Content_Types].xml if png is not registered
let contentTypes = templateZip.readAsText('[Content_Types].xml');
if (!contentTypes.includes('Extension="png"')) {
  contentTypes = contentTypes.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
  templateZip.updateFile('[Content_Types].xml', Buffer.from(contentTypes, 'utf8'));
}

// 3. Update Slide 6 Rels & XML (Live App Screenshot)
let rels6 = templateZip.readAsText('ppt/slides/_rels/slide6.xml.rels');
if (!rels6.includes('app_screenshot.png')) {
  rels6 = rels6.replace('</Relationships>', '<Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/app_screenshot.png"/></Relationships>');
  templateZip.updateFile('ppt/slides/_rels/slide6.xml.rels', Buffer.from(rels6, 'utf8'));
}

let s6 = templateZip.readAsText('ppt/slides/slide6.xml');
// Add picture tag for screenshot
const picShape6 = `
<p:pic>
  <p:nvPicPr>
    <p:cNvPr id="601" name="App Screenshot" descr="ChalaakSaathi Live Dashboard"/>
    <p:cNvPicPr preferRelativeResize="0"/>
    <p:nvPr/>
  </p:nvPicPr>
  <p:blipFill>
    <a:blip r:embed="rIdImg"/>
    <a:stretch><a:fillRect/></a:stretch>
  </p:blipFill>
  <p:spPr>
    <a:xfrm>
      <a:off x="311700" y="1100000"/>
      <a:ext cx="8520000" cy="3850000"/>
    </a:xfrm>
    <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 2000"/></a:avLst></a:prstGeom>
    <a:ln w="25400"><a:solidFill><a:srgbClr val="38BDF8"/></a:solidFill></a:ln>
  </p:spPr>
</p:pic>
`;

s6 = s6.replace('</p:spTree>', `${picShape6}</p:spTree>`);
// Update title text on slide 6
s6 = s6.replace('<a:t>Wireframes/Mock diagrams of the proposed solution (optional)</a:t>', '<a:t>Live Prototype Dashboard (http://localhost:3000 • GitHub: github.com/swatiicfai/ChalaakSaathi-DhwaniFleet-)</a:t>');
templateZip.updateFile('ppt/slides/slide6.xml', Buffer.from(s6, 'utf8'));


// 4. Update Slide 7 Rels & XML (Live Architecture Diagram)
let rels7 = templateZip.readAsText('ppt/slides/_rels/slide7.xml.rels');
if (!rels7.includes('arch_diagram.png')) {
  rels7 = rels7.replace('</Relationships>', '<Relationship Id="rIdArch" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/arch_diagram.png"/></Relationships>');
  templateZip.updateFile('ppt/slides/_rels/slide7.xml.rels', Buffer.from(rels7, 'utf8'));
}

let s7 = templateZip.readAsText('ppt/slides/slide7.xml');
const picShape7 = `
<p:pic>
  <p:nvPicPr>
    <p:cNvPr id="701" name="Architecture Diagram" descr="ChalaakSaathi End-to-End System Architecture"/>
    <p:cNvPicPr preferRelativeResize="0"/>
    <p:nvPr/>
  </p:nvPicPr>
  <p:blipFill>
    <a:blip r:embed="rIdArch"/>
    <a:stretch><a:fillRect/></a:stretch>
  </p:blipFill>
  <p:spPr>
    <a:xfrm>
      <a:off x="311700" y="1100000"/>
      <a:ext cx="8520000" cy="3850000"/>
    </a:xfrm>
    <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 2000"/></a:avLst></a:prstGeom>
    <a:ln w="25400"><a:solidFill><a:srgbClr val="06B6D4"/></a:solidFill></a:ln>
  </p:spPr>
</p:pic>
`;

s7 = s7.replace('</p:spTree>', `${picShape7}</p:spTree>`);
s7 = s7.replace('<a:t>Architecture diagram of the proposed solution</a:t>', '<a:t>Live System & Agentic Architecture (Gemini 2.0 Live • GitHub: github.com/swatiicfai/ChalaakSaathi-DhwaniFleet-)</a:t>');
templateZip.updateFile('ppt/slides/slide7.xml', Buffer.from(s7, 'utf8'));


// 5. Update Slide 1 (Title Cover) with GitHub Link
let s1 = templateZip.readAsText('ppt/slides/slide1.xml');
s1 = s1.replace(/Team Name\s*:\s*/g, 'Team Name : ChalaakSaathi (चालाक साथी)\nGitHub Repo : https://github.com/swatiicfai/ChalaakSaathi-DhwaniFleet-\n');
s1 = s1.replace(/Problem Statement\s*:\s*/g, 'Problem Statement : Open Innovation: Real-World Voice AI for Cold-Chain Reefer Detention Resolution\n');
s1 = s1.replace(/Team Leader Name\s*:\s*/g, 'Team Leader Name : Swati Gupta\n');
templateZip.updateFile('ppt/slides/slide1.xml', Buffer.from(s1, 'utf8'));

// 6. Update Slide 8 (Tech Stack) with GitHub link
let s8 = templateZip.readAsText('ppt/slides/slide8.xml');
s8 = s8.replace('<a:t>Technologies to be used in the solution:</a:t>', '<a:t>Technologies & GitHub Repo: https://github.com/swatiicfai/ChalaakSaathi-DhwaniFleet-</a:t>');
templateZip.updateFile('ppt/slides/slide8.xml', Buffer.from(s8, 'utf8'));

// 7. Update Slide 12 (Conclusion) with GitHub link
let s12 = templateZip.readAsText('ppt/slides/slide12.xml');
const s12Content = `
<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="1201" name="ConclusionBox"/>
    <p:cNvSpPr txBox="1"/>
    <p:nvPr/>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="500000" y="1500000"/><a:ext cx="8144000" cy="3000000"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:noFill/>
  </p:spPr>
  <p:txBody>
    <a:bodyPr/><a:lstStyle/>
    <a:p>
      <a:pPr algn="ctr"/>
      <a:r>
        <a:rPr lang="en-US" sz="2400" b="1"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Google Sans"/></a:rPr>
        <a:t>Thank You! Team ChalaakSaathi</a:t>
      </a:r>
    </a:p>
    <a:p>
      <a:pPr algn="ctr"/>
      <a:r>
        <a:rPr lang="en-US" sz="1400"><a:solidFill><a:srgbClr val="0284C7"/></a:solidFill><a:latin typeface="Google Sans"/></a:rPr>
        <a:t>Open Source GitHub Repository: https://github.com/swatiicfai/ChalaakSaathi-DhwaniFleet-</a:t>
      </a:r>
    </a:p>
    <a:p>
      <a:pPr algn="ctr"/>
      <a:r>
        <a:rPr lang="en-US" sz="1200"><a:solidFill><a:srgbClr val="475569"/></a:solidFill><a:latin typeface="Google Sans"/></a:rPr>
        <a:t>Live Prototype Running on Google Gemini 2.0 Flash Multimodal Live • http://localhost:3000</a:t>
      </a:r>
    </a:p>
  </p:txBody>
</p:sp>
`;
s12 = s12.replace('</p:spTree>', `${s12Content}</p:spTree>`);
templateZip.updateFile('ppt/slides/slide12.xml', Buffer.from(s12, 'utf8'));

// Save to destination files
const targetPptx = 'C:\\Users\\Swati\\Downloads\\ChalaakSaathi_Idea_Submission_Deck.pptx';
const localPptx = path.join(__dirname, 'ChalaakSaathi_Idea_Submission_Deck.pptx');

templateZip.writeZip(targetPptx);
templateZip.writeZip(localPptx);

console.log('SUCCESS! Updated PPTX with embedded Architecture Diagram, Live Screenshot, and GitHub link:');
console.log('1. ', targetPptx);
console.log('2. ', localPptx);
