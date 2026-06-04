{
  description = "OC Forest Cover";
  nixConfig = {
    bash-prompt = "λ ";
  };
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {      
      
      formatter = pkgs.nixfmt-rfc-style;

      checks.whitespace = pkgs.stdenvNoCC.mkDerivation {
        name = "check-whitespace";
        dontBuild = true;
        src = ./.;
        doCheck = true;
        checkPhase = ''
          ${pkgs.haskellPackages.fix-whitespace}/bin/fix-whitespace --check
        '';
        installPhase = ''mkdir "$out"'';
      };

      devShells.default = pkgs.mkShell {
        buildInputs = [
          # Stats
          pkgs.R
          pkgs.rPackages.dplyr
          pkgs.rPackages.tidyr
          pkgs.rPackages.purrr
          pkgs.rPackages.stringr
          pkgs.rPackages.lubridate
          pkgs.rPackages.ggplot2
          pkgs.rPackages.knitr
          pkgs.rPackages.rmarkdown
          pkgs.rPackages.PropCIs
          pkgs.rPackages.sp
          pkgs.rPackages.httr
          pkgs.rPackages.sf
          pkgs.rPackages.lwgeom
          pkgs.rPackages.jsonlite
          pkgs.rPackages.languageserver
          pkgs.pandoc

          # Development tools
          pkgs.flyctl
          pkgs.nodePackages.prettier
          pkgs.nodePackages.eslint
          pkgs.updog

          # Code tools
          pkgs.haskellPackages.fix-whitespace
          pkgs.shellcheck
        ];
      }; 
    });
}
