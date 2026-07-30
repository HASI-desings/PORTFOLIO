// ============ HEADER SCROLL STATE ============
const header = document.getElementById('site-header');
window.addEventListener('scroll', ()=>{
  header.classList.toggle('scrolled', window.scrollY > 40);
}, { passive:true });

// ============ ACTIVE NAV LINK ============
const sections = document.querySelectorAll('main > section');
const navLinks = document.querySelectorAll('.nav-link');
const setActive = ()=>{
  let current = sections[0].id;
  sections.forEach(sec=>{
    if (window.scrollY >= sec.offsetTop - window.innerHeight/2) current = sec.id;
  });
  navLinks.forEach(l=>{
    l.classList.toggle('active', l.getAttribute('href') === `#${current}`);
  });
};
window.addEventListener('scroll', setActive, { passive:true });
setActive();

// ============ THEME TOGGLE ============
const themeToggle = document.getElementById('theme-toggle');
const applyTheme = (mode)=>{
  document.body.classList.toggle('light', mode === 'light');
  document.body.classList.toggle('dark', mode !== 'light');
  localStorage.setItem('hs-theme', mode);
};
const savedTheme = localStorage.getItem('hs-theme') || 'dark';
applyTheme(savedTheme);
themeToggle.addEventListener('click', ()=>{
  const next = document.body.classList.contains('light') ? 'dark' : 'light';
  applyTheme(next);
});

// ============ SCROLL REVEALS (GSAP) ============
if (window.gsap && window.ScrollTrigger){
  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray('.project-row').forEach((row, i)=>{
    gsap.to(row, {
      opacity:1, y:0, duration:1, ease:'power3.out',
      scrollTrigger:{ trigger: row, start:'top 82%' }
    });
  });

  gsap.from('.contact-title', {
    opacity:0, y:30, duration:1, ease:'power3.out',
    scrollTrigger:{ trigger:'.contact', start:'top 80%' }
  });

  gsap.from('.about-body p', {
    opacity:0, y:20, duration:.9, stagger:.15, ease:'power3.out',
    scrollTrigger:{ trigger:'.about', start:'top 78%' }
  });
} else {
  document.querySelectorAll('.project-row').forEach(r=>{ r.style.opacity = 1; r.style.transform = 'none'; });
}
