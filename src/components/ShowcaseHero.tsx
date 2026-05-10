"use client";
import React from "react";
import { ContainerScroll } from "./ui/container-scroll-animation";

export function ShowcaseHero() {
  return (
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl font-semibold text-black dark:text-white">
              Explora la nueva <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none tracking-tighter italic uppercase">
                Vitrina Digital
              </span>
            </h1>
          </>
        }
      >
        <img
          src="https://picsum.photos/seed/sneaker-showcase/1400/800"
          alt="hero"
          className="mx-auto rounded-2xl object-cover h-full object-center"
          draggable={false}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </ContainerScroll>
    </div>
  );
}
