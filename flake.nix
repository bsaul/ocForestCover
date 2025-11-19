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
          # pkgs.rPackages.spatial
          # pkgs.rPackages.rgdal
          pkgs.rPackages.dplyr
          pkgs.rPackages.sp
          # pkgs.rPackages.rgeos

          # Development tools
          pkgs.flyctl
          pkgs.nodePackages.prettier
          pkgs.nodePackages.eslint
          pkgs.updog

          # Code tools
          pkgs.haskellPackages.fix-whitespace
        ];
      }; 
    });
}
